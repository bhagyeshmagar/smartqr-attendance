import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sessionsApi, domainsApi } from '../../api';
import Modal from '../../components/Modal';

interface Session {
    id: string;
    title: string;
    description: string | null;
    status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    startedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    domain: { name: string };
    createdBy: { firstName: string; lastName: string };
    _count: { attendances: number };
}

interface Domain {
    id: string;
    name: string;
    slug: string;
}

export default function Sessions() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state for creating session
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [domainId, setDomainId] = useState('');
    const [domains, setDomains] = useState<Domain[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const response = await sessionsApi.getAll();
            setSessions(response.data);
        } catch {
            setError('Failed to load sessions');
        } finally {
            setIsLoading(false);
        }
    };

    const loadDomains = async () => {
        try {
            const response = await domainsApi.getAll();
            setDomains(response.data);
            if (response.data.length > 0) {
                setDomainId(response.data[0].id);
            }
        } catch {
            setCreateError('Failed to load domains');
        }
    };

    const openCreateModal = () => {
        setTitle('');
        setDescription('');
        setCreateError('');
        loadDomains();
        setIsModalOpen(true);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setIsCreating(true);

        try {
            const response = await sessionsApi.create({ title, description, domainId });
            setIsModalOpen(false);
            navigate(`/admin/sessions/${response.data.id}`);
        } catch {
            setCreateError('Failed to create session');
        } finally {
            setIsCreating(false);
        }
    };

    const handleStart = async (id: string) => {
        try {
            await sessionsApi.start(id);
            loadSessions();
        } catch {
            setError('Failed to start session');
        }
    };

    const handleStop = async (id: string) => {
        try {
            await sessionsApi.stop(id);
            loadSessions();
        } catch {
            setError('Failed to stop session');
        }
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            DRAFT: 'badge badge-draft',
            ACTIVE: 'badge badge-active',
            COMPLETED: 'badge badge-completed',
            CANCELLED: 'badge badge-cancelled',
        };
        return <span className={classes[status] || 'badge'}>{status}</span>;
    };

    if (isLoading) {
        return <div className="loading-screen">Loading sessions...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Sessions</h1>
                <button onClick={openCreateModal} className="btn btn-primary">
                    + New Session
                </button>
            </div>

            {error && <div className="form-error mb-4">{error}</div>}

            <div className="session-list">
                {sessions.length === 0 ? (
                    <div className="card">
                        <div className="card-body text-center">
                            <p className="text-muted">No sessions yet. Create your first session!</p>
                        </div>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div key={session.id} className="session-card">
                            <div className="session-card-header">
                                <div>
                                    <h3 className="session-title">{session.title}</h3>
                                    {session.description && (
                                        <p className="session-description">{session.description}</p>
                                    )}
                                </div>
                                {getStatusBadge(session.status)}
                            </div>

                            <div className="session-meta">
                                <span>Domain: {session.domain.name}</span>
                                <span>Attendees: {session._count.attendances}</span>
                                <span>Created: {new Date(session.createdAt).toLocaleDateString()}</span>
                            </div>

                            <div className="session-actions">
                                <Link to={`/admin/sessions/${session.id}`} className="btn btn-secondary btn-sm">
                                    View
                                </Link>
                                {session.status === 'DRAFT' && (
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleStart(session.id)}
                                    >
                                        Start
                                    </button>
                                )}
                                {session.status === 'ACTIVE' && (
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleStop(session.id)}
                                    >
                                        Stop
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Session Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Session"
            >
                <form onSubmit={handleCreateSubmit}>
                    {createError && <div className="form-error mb-4">{createError}</div>}

                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Introduction to Computer Science"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Domain *</label>
                        <select
                            className="form-input"
                            value={domainId}
                            onChange={(e) => setDomainId(e.target.value)}
                            required
                        >
                            {domains.map((domain) => (
                                <option key={domain.id} value={domain.id}>
                                    {domain.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 mt-6 justify-end">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isCreating}
                        >
                            {isCreating ? 'Creating...' : 'Create Session'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
