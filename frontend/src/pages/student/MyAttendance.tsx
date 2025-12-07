import { useState, useEffect } from 'react';
import { attendanceApi } from '../../api';

interface SubjectGroup {
    subject: {
        id: string;
        name: string;
        code: string | null;
    } | null;
    sessions: Array<{
        sessionId: string;
        sessionNumber: number;
        title: string;
        status: string;
        startedAt: string | null;
        endedAt: string | null;
        entryAt: string | null;
        exitAt: string | null;
        attendanceStatus: string;
    }>;
}

export default function MyAttendance() {
    const [groups, setGroups] = useState<SubjectGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

    useEffect(() => {
        loadAttendance();
    }, []);

    const loadAttendance = async () => {
        try {
            const response = await attendanceApi.getMyAttendanceGrouped();
            setGroups(response.data);
            // Auto-expand first subject if available
            if (response.data.length > 0) {
                setExpandedSubject(response.data[0].subject?.id || 'no-subject');
            }
        } catch {
            setError('Failed to load attendance history');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (isLoading) {
        return <div className="loading-screen">Loading...</div>;
    }

    return (
        <div>
            <h1 className="page-title">Attendance History</h1>
            <p className="text-muted mb-4">Your attendance records grouped by subject</p>

            {error && <div className="form-error mb-4">{error}</div>}

            {groups.length === 0 ? (
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                        <h3>No Attendance Records</h3>
                        <p className="text-muted">
                            You haven't marked attendance for any sessions yet.
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {groups.map((group) => {
                        const subjectId = group.subject?.id || 'no-subject';
                        const isExpanded = expandedSubject === subjectId;
                        const presentCount = group.sessions.filter(s => s.attendanceStatus === 'PRESENT').length;
                        const absentCount = group.sessions.filter(s => s.attendanceStatus === 'ABSENT').length;

                        return (
                            <div key={subjectId} className="card">
                                {/* Subject Header */}
                                <div
                                    className="card-body"
                                    style={{
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                                    }}
                                    onClick={() => setExpandedSubject(isExpanded ? null : subjectId)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {isExpanded ? '▼' : '▶'}{' '}
                                                {group.subject?.name || 'Other Sessions'}
                                            </h3>
                                            {group.subject?.code && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.125rem 0.5rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '4px',
                                                }}>
                                                    {group.subject.code}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                                                color: 'var(--success)',
                                            }}>
                                                ✓ {presentCount} Present
                                            </span>
                                            {absentCount > 0 && (
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                                                    color: 'var(--danger)',
                                                }}>
                                                    ✗ {absentCount} Absent
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Sessions Grid */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '1rem',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                        gap: '0.75rem',
                                    }}>
                                        {group.sessions.map((session) => {
                                            const isAbsent = session.attendanceStatus === 'ABSENT';
                                            const isPending = session.attendanceStatus === 'PENDING';

                                            return (
                                                <div
                                                    key={session.sessionId}
                                                    style={{
                                                        padding: '0.75rem',
                                                        borderRadius: '8px',
                                                        border: `2px solid ${isAbsent ? 'var(--danger)' : isPending ? 'var(--warning)' : 'var(--success)'}`,
                                                        backgroundColor: isAbsent
                                                            ? 'rgba(231, 76, 60, 0.05)'
                                                            : isPending
                                                                ? 'rgba(241, 196, 15, 0.05)'
                                                                : 'rgba(46, 204, 113, 0.05)',
                                                    }}
                                                >
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '0.5rem',
                                                    }}>
                                                        <span style={{
                                                            fontWeight: 600,
                                                            fontSize: '0.875rem',
                                                        }}>
                                                            Session {session.sessionNumber}
                                                        </span>
                                                        {isAbsent && <span style={{ color: 'var(--danger)' }}>✗</span>}
                                                        {isPending && <span style={{ color: 'var(--warning)' }}>⏳</span>}
                                                        {!isAbsent && !isPending && <span style={{ color: 'var(--success)' }}>✓</span>}
                                                    </div>

                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        <div style={{ marginBottom: '0.25rem' }}>
                                                            📅 {formatDate(session.startedAt)}
                                                        </div>
                                                        <div style={{ marginBottom: '0.25rem' }}>
                                                            📥 In: {formatTime(session.entryAt)}
                                                        </div>
                                                        <div>
                                                            📤 Out: {formatTime(session.exitAt)}
                                                        </div>
                                                    </div>

                                                    {isAbsent && (
                                                        <div style={{
                                                            marginTop: '0.5rem',
                                                            padding: '0.25rem',
                                                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                                                            borderRadius: '4px',
                                                            textAlign: 'center',
                                                            fontSize: '0.625rem',
                                                            fontWeight: 600,
                                                            color: 'var(--danger)',
                                                            textTransform: 'uppercase',
                                                        }}>
                                                            Absent
                                                        </div>
                                                    )}
                                                    {isPending && (
                                                        <div style={{
                                                            marginTop: '0.5rem',
                                                            padding: '0.25rem',
                                                            backgroundColor: 'rgba(241, 196, 15, 0.1)',
                                                            borderRadius: '4px',
                                                            textAlign: 'center',
                                                            fontSize: '0.625rem',
                                                            fontWeight: 600,
                                                            color: 'var(--warning)',
                                                            textTransform: 'uppercase',
                                                        }}>
                                                            Scan Exit
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
