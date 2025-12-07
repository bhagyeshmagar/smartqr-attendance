import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjectsApi, domainsApi, deleteRequestsApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface Subject {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    domain: { id: string; name: string };
    _count: { sessions: number };
    createdAt: string;
}

interface Domain {
    id: string;
    name: string;
}

export default function Subjects() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', code: '', description: '', domainId: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [subjectsRes, domainsRes] = await Promise.all([
                subjectsApi.getAll(),
                domainsApi.getAll(),
            ]);
            setSubjects(subjectsRes.data);
            setDomains(domainsRes.data);
            if (domainsRes.data.length > 0 && !form.domainId) {
                setForm(prev => ({ ...prev, domainId: domainsRes.data[0].id }));
            }
        } catch {
            setError('Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.domainId) return;

        setSaving(true);
        try {
            await subjectsApi.create({
                name: form.name,
                code: form.code || undefined,
                description: form.description || undefined,
                domainId: form.domainId,
            });
            setShowModal(false);
            setForm({ name: '', code: '', description: '', domainId: domains[0]?.id || '' });
            loadData();
        } catch {
            setError('Failed to create subject');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (isSuperAdmin) {
            // Super Admin can delete directly
            if (!confirm(`Delete subject "${name}"? This will also delete all sessions under it.`)) return;
            try {
                await subjectsApi.delete(id);
                loadData();
            } catch {
                setError('Failed to delete subject');
            }
        } else {
            // Admin must request deletion
            const reason = prompt(`Request to delete "${name}"? Enter reason (optional):`);
            if (reason === null) return; // User cancelled
            try {
                await deleteRequestsApi.create('SUBJECT', id, reason || undefined);
                setSuccess('Delete request submitted. Awaiting Super Admin approval.');
                setTimeout(() => setSuccess(''), 5000);
            } catch {
                setError('Failed to submit delete request');
            }
        }
    };

    if (loading) return <div className="loading-screen">Loading subjects...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Subjects</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + New Subject
                </button>
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

            {subjects.length === 0 ? (
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                        <h3>No Subjects Yet</h3>
                        <p className="text-muted">Create a subject to organize your sessions</p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            Create First Subject
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {subjects.map(subject => (
                        <div key={subject.id} className="card" style={{ cursor: 'pointer' }}>
                            <div className="card-body" onClick={() => navigate(`/admin/subjects/${subject.id}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ marginBottom: '0.25rem' }}>{subject.name}</h3>
                                        {subject.code && (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.125rem 0.5rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                marginBottom: '0.5rem',
                                            }}>
                                                {subject.code}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className={`btn ${isSuperAdmin ? 'btn-danger' : 'btn-warning'} btn-sm`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(subject.id, subject.name);
                                        }}
                                    >
                                        {isSuperAdmin ? 'Delete' : 'Request Delete'}
                                    </button>
                                </div>
                                {subject.description && (
                                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                        {subject.description}
                                    </p>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <span>{subject.domain.name}</span>
                                    <span>{subject._count.sessions} sessions</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Subject Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                        <div className="card-header">
                            <h2 className="card-title">Create Subject</h2>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="card-body">
                                <div className="form-group">
                                    <label className="form-label">Subject Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.name}
                                        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Introduction to Computer Science"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject Code (optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.code}
                                        onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                                        placeholder="e.g., CS101"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description (optional)</label>
                                    <textarea
                                        className="form-input"
                                        rows={2}
                                        value={form.description}
                                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Brief description of the subject"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Domain *</label>
                                    <select
                                        className="form-input"
                                        value={form.domainId}
                                        onChange={e => setForm(prev => ({ ...prev, domainId: e.target.value }))}
                                        required
                                    >
                                        {domains.map(domain => (
                                            <option key={domain.id} value={domain.id}>{domain.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Creating...' : 'Create Subject'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
