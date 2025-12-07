import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subjectsApi, sessionsApi } from '../../api';

interface Subject {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    domain: { id: string; name: string };
    sessions: Session[];
}

interface Session {
    id: string;
    title: string;
    status: string;
    phase: string;
    sessionNumber: number;
    startedAt: string | null;
    endedAt: string | null;
    _count: { attendances: number };
}

export default function SubjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [sessionTitle, setSessionTitle] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (id) loadSubject();
    }, [id]);

    const loadSubject = async () => {
        try {
            const response = await subjectsApi.getById(id!);
            setSubject(response.data);
        } catch {
            setError('Failed to load subject');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionTitle || !subject) return;

        setCreating(true);
        try {
            await sessionsApi.create({
                title: sessionTitle,
                domainId: subject.domain.id,
                subjectId: subject.id,
            });
            setShowModal(false);
            setSessionTitle('');
            loadSubject();
        } catch {
            setError('Failed to create session');
        } finally {
            setCreating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string }> = {
            DRAFT: { bg: 'rgba(156, 163, 175, 0.1)', color: 'var(--text-muted)' },
            ACTIVE: { bg: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)' },
            COMPLETED: { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' },
            CANCELLED: { bg: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)' },
        };
        const style = styles[status] || styles.DRAFT;
        return (
            <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.color,
                textTransform: 'uppercase',
            }}>
                {status}
            </span>
        );
    };

    if (loading) return <div className="loading-screen">Loading subject...</div>;
    if (!subject) return <div className="loading-screen">Subject not found</div>;

    return (
        <div>
            <button
                onClick={() => navigate('/admin/subjects')}
                style={{
                    background: 'none', border: 'none', color: 'var(--primary)',
                    cursor: 'pointer', padding: 0, marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
            >
                ← Back to Subjects
            </button>

            <div className="page-header">
                <div>
                    <h1 className="page-title">{subject.name}</h1>
                    <p className="text-muted">
                        {subject.code && `${subject.code} • `}
                        {subject.domain.name}
                    </p>
                    {subject.description && (
                        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>{subject.description}</p>
                    )}
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + New Session
                </button>
            </div>

            {error && <div className="form-error mb-4">{error}</div>}

            {subject.sessions.length === 0 ? (
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                        <h3>No Sessions Yet</h3>
                        <p className="text-muted">Create your first session for this subject</p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            Create First Session
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Sessions ({subject.sessions.length})</h2>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {subject.sessions.map((session, index) => (
                            <div
                                key={session.id}
                                onClick={() => navigate(`/admin/sessions/${session.id}`)}
                                style={{
                                    padding: '1rem',
                                    borderBottom: index < subject.sessions.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div>
                                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                                        Session {session.sessionNumber}: {session.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {session.startedAt
                                            ? `Started: ${new Date(session.startedAt).toLocaleString()}`
                                            : 'Not started yet'
                                        }
                                        {session.endedAt && ` • Ended: ${new Date(session.endedAt).toLocaleString()}`}
                                        {' • '}{session._count.attendances} attendances
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {getStatusBadge(session.status)}
                                    {session.status === 'ACTIVE' && (
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.625rem',
                                            fontWeight: 600,
                                            backgroundColor: session.phase === 'ENTRY' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)',
                                            color: session.phase === 'ENTRY' ? 'var(--success)' : 'var(--warning)',
                                        }}>
                                            {session.phase}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Session Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
                        <div className="card-header">
                            <h2 className="card-title">Create Session</h2>
                        </div>
                        <form onSubmit={handleCreateSession}>
                            <div className="card-body">
                                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                                    Creating session #{subject.sessions.length + 1} for <strong>{subject.name}</strong>
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Session Title *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={sessionTitle}
                                        onChange={e => setSessionTitle(e.target.value)}
                                        placeholder="e.g., Lecture 1 - Introduction"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
