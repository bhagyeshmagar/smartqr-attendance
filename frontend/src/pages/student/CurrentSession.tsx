import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../../api';

interface Session {
    id: string;
    title: string;
    phase: string;
    sessionNumber: number;
    startedAt: string;
    subject?: {
        id: string;
        name: string;
        code: string | null;
    };
    _count: {
        attendances: number;
    };
}

export default function CurrentSession() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadActiveSessions();
        // Poll every 30 seconds for new sessions
        const interval = setInterval(loadActiveSessions, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadActiveSessions = async () => {
        try {
            const response = await sessionsApi.getActive();
            setSessions(response.data);
            setError('');
        } catch {
            setError('Failed to load active sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = (sessionId: string) => {
        navigate(`/student/session/${sessionId}/scan`);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p>Loading active sessions...</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="page-title">Current Session</h1>
            <p className="text-muted mb-4">Active sessions you can mark attendance for</p>

            {error && <div className="form-error mb-4">{error}</div>}

            {sessions.length === 0 ? (
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                        <h3>No Active Sessions</h3>
                        <p className="text-muted">
                            There are no active sessions right now.<br />
                            Check back when your instructor starts a session.
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {sessions.map(session => (
                        <div key={session.id} className="card">
                            <div className="card-body">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <h3 style={{ marginBottom: '0.5rem' }}>
                                            {session.subject?.name || session.title}
                                        </h3>
                                        {session.subject?.code && (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.25rem 0.5rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                marginBottom: '0.5rem',
                                            }}>
                                                {session.subject.code}
                                            </span>
                                        )}
                                        <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
                                            Session #{session.sessionNumber} • Started at{' '}
                                            {new Date(session.startedAt).toLocaleTimeString()}
                                        </p>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: session.phase === 'ENTRY'
                                                ? 'rgba(46, 204, 113, 0.1)'
                                                : 'rgba(241, 196, 15, 0.1)',
                                            color: session.phase === 'ENTRY'
                                                ? 'var(--success)'
                                                : 'var(--warning)',
                                        }}>
                                            {session.phase === 'ENTRY' ? '📥 Entry Phase' : '📤 Exit Phase'}
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleScan(session.id)}
                                        style={{ minWidth: '120px' }}
                                    >
                                        📷 Scan QR
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
