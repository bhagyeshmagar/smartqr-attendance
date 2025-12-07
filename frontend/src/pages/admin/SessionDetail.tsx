import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import QRCode from 'qrcode';
import { sessionsApi, attendanceApi, deleteRequestsApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface Session {
    id: string;
    title: string;
    description: string | null;
    status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    phase: 'ENTRY' | 'EXIT';
    sessionNumber: number;
    startedAt: string | null;
    domain: { name: string };
    subject?: { id: string; name: string; code: string | null };
    _count: { attendances: number };
}

interface Attendance {
    id: string;
    markedAt: string;
    entryAt: string | null;
    exitAt: string | null;
    status: string;
    user: { id: string; firstName: string; lastName: string; email: string; prn: string | null };
    verificationFlags: { flagged?: boolean; reason?: string } | null;
}

export default function SessionDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [session, setSession] = useState<Session | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [token, setToken] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState(30);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const loadSession = useCallback(async () => {
        if (!id) return;
        try {
            const response = await sessionsApi.getById(id);
            setSession(response.data);
            setAttendances(response.data.attendances || []);
        } catch {
            setError('Failed to load session');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const loadAttendances = useCallback(async () => {
        if (!id) return;
        try {
            const response = await attendanceApi.getBySession(id);
            setAttendances(response.data);
        } catch (err) {
            console.error('Failed to load attendances:', err);
        }
    }, [id]);

    // Generate QR code from token
    useEffect(() => {
        if (token && canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, token, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
            }).catch(console.error);
        }
    }, [token]);

    // Timer countdown
    useEffect(() => {
        if (session?.status !== 'ACTIVE') return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) return 30;
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [session?.status]);

    // WebSocket connection for token updates
    useEffect(() => {
        if (!id || session?.status !== 'ACTIVE') return;

        const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
        const socket = io(`${wsUrl}/ws`, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            socket.emit('join:session', { sessionId: id });
        });

        socket.on('token', (data: { token: string }) => {
            setToken(data.token);
            setTimeLeft(30);
        });

        socket.on('attendance', () => {
            loadAttendances();
        });

        // Get initial token
        sessionsApi.getToken(id).then((res) => {
            if (res.data.token) {
                setToken(res.data.token);
            }
        });

        return () => {
            socket.emit('leave:session', { sessionId: id });
            socket.disconnect();
        };
    }, [id, session?.status, loadAttendances]);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    const handleStart = async () => {
        if (!id) return;
        try {
            await sessionsApi.start(id);
            loadSession();
        } catch {
            setError('Failed to start session');
        }
    };

    const handleSwitchToExit = async () => {
        if (!id) return;
        try {
            await sessionsApi.switchToExit(id);
            loadSession();
        } catch {
            setError('Failed to switch to exit phase');
        }
    };

    const handleStop = async () => {
        if (!id) return;
        try {
            await sessionsApi.stop(id);
            loadSession();
            setToken('');
        } catch {
            setError('Failed to stop session');
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        if (isSuperAdmin) {
            if (!confirm('Are you sure you want to delete this session?')) return;
            try {
                await sessionsApi.delete(id);
                navigate('/admin/sessions');
            } catch {
                setError('Failed to delete session');
            }
        } else {
            const reason = prompt('Request to delete this session? Enter reason (optional):');
            if (reason === null) return;
            try {
                await deleteRequestsApi.create('SESSION', id, reason || undefined);
                setSuccess('Delete request submitted. Awaiting Super Admin approval.');
            } catch {
                setError('Failed to submit delete request');
            }
        }
    };

    if (isLoading) {
        return <div className="loading-screen">Loading session...</div>;
    }

    if (!session) {
        return <div className="loading-screen">Session not found</div>;
    }

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            DRAFT: 'badge badge-draft',
            ACTIVE: 'badge badge-active',
            COMPLETED: 'badge badge-completed',
            CANCELLED: 'badge badge-cancelled',
        };
        return <span className={classes[status] || 'badge'}>{status}</span>;
    };

    const getPhaseBadge = (phase: string) => {
        return (
            <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: phase === 'ENTRY' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)',
                color: phase === 'ENTRY' ? 'var(--success)' : 'var(--warning)',
            }}>
                {phase === 'ENTRY' ? '📥 Entry Phase' : '📤 Exit Phase'}
            </span>
        );
    };

    const getAttendanceStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string; label: string }> = {
            PRESENT: { bg: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', label: '✓ Present' },
            ABSENT: { bg: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', label: '✗ Absent' },
            PENDING: { bg: 'rgba(241, 196, 15, 0.1)', color: 'var(--warning)', label: '⏳ Pending' },
        };
        const style = styles[status] || styles.PENDING;
        return (
            <span style={{
                padding: '0.125rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.color,
            }}>
                {style.label}
            </span>
        );
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{session.subject?.name || session.title}</h1>
                    <p className="text-muted">
                        {session.subject?.code && `${session.subject.code} • `}
                        Session #{session.sessionNumber} • {session.domain.name}
                    </p>
                </div>
                <div className="flex gap-2">
                    {session.status === 'DRAFT' && (
                        <>
                            <button className="btn btn-success" onClick={handleStart}>
                                Start Session
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                Delete
                            </button>
                        </>
                    )}
                    {session.status === 'ACTIVE' && session.phase === 'ENTRY' && (
                        <button className="btn btn-warning" onClick={handleSwitchToExit}>
                            Switch to Exit QR
                        </button>
                    )}
                    {session.status === 'ACTIVE' && (
                        <button className="btn btn-danger" onClick={handleStop}>
                            Stop Session
                        </button>
                    )}
                    {session.status === 'COMPLETED' && (
                        <button className={`btn ${isSuperAdmin ? 'btn-danger' : 'btn-warning'}`} onClick={handleDelete}>
                            {isSuperAdmin ? 'Delete' : 'Request Delete'}
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="form-error mb-4">{error}</div>}
            {success && (
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    color: 'var(--success)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                }}>
                    {success}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* QR Code Section */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">QR Code {getStatusBadge(session.status)}</h2>
                        {session.status === 'ACTIVE' && getPhaseBadge(session.phase)}
                    </div>
                    <div className="card-body">
                        {session.status === 'ACTIVE' && token ? (
                            <div className="qr-container">
                                <div className="qr-code">
                                    <canvas ref={canvasRef} />
                                </div>
                                <div className="qr-timer">
                                    <div className="qr-timer-label">Next rotation in</div>
                                    <div className="qr-timer-value">{timeLeft}s</div>
                                    <div className="qr-rotating">
                                        <span>●</span> Auto-rotating every 30 seconds
                                    </div>
                                </div>
                                {session.phase === 'ENTRY' && (
                                    <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        Students scan this QR to mark <strong>entry</strong>. Click "Switch to Exit QR" when ready.
                                    </p>
                                )}
                                {session.phase === 'EXIT' && (
                                    <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        Students scan this QR to mark <strong>exit</strong>. Stop session when done.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-muted" style={{ padding: '3rem' }}>
                                {session.status === 'DRAFT' && 'Start the session to display QR code'}
                                {session.status === 'COMPLETED' && 'Session has ended'}
                                {session.status === 'CANCELLED' && 'Session was cancelled'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Attendance List Section */}
                <div className="card">
                    <div className="card-header flex justify-between items-center">
                        <h2 className="card-title">Attendance ({attendances.length})</h2>
                        <button className="btn btn-secondary btn-sm" onClick={loadAttendances}>
                            Refresh
                        </button>
                    </div>
                    <div className="card-body">
                        {attendances.length === 0 ? (
                            <p className="text-center text-muted">No attendance yet</p>
                        ) : (
                            <div className="attendance-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {attendances.map((attendance) => (
                                    <div
                                        key={attendance.id}
                                        className={`attendance-item ${attendance.verificationFlags?.flagged ? 'flagged' : ''}`}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            borderBottom: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 500 }}>
                                                {attendance.user.firstName} {attendance.user.lastName}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {attendance.user.prn && `PRN: ${attendance.user.prn} • `}
                                                In: {attendance.entryAt ? new Date(attendance.entryAt).toLocaleTimeString() : '--:--'}
                                                {' | '}
                                                Out: {attendance.exitAt ? new Date(attendance.exitAt).toLocaleTimeString() : '--:--'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {getAttendanceStatusBadge(attendance.status)}
                                            {attendance.verificationFlags?.flagged && (
                                                <span className="badge badge-flagged">
                                                    {attendance.verificationFlags.reason}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
