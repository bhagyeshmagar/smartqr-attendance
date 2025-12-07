import { useEffect, useState } from 'react';
import { deleteRequestsApi } from '../../api';

interface DeleteRequest {
    id: string;
    type: string;
    reason: string | null;
    status: string;
    createdAt: string;
    requestedBy: { id: string; firstName: string; lastName: string; email: string };
    approvedBy?: { id: string; firstName: string; lastName: string };
    session?: { id: string; title: string; status: string; subject?: { id: string; name: string } };
    subject?: { id: string; name: string; code: string; _count: { sessions: number } };
}

export default function DeleteRequests() {
    const [requests, setRequests] = useState<DeleteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending'>('pending');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const loadRequests = async () => {
        try {
            const response = filter === 'pending'
                ? await deleteRequestsApi.getPending()
                : await deleteRequestsApi.getAll();
            setRequests(response.data);
        } catch {
            setError('Failed to load delete requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this delete request? The item will be permanently deleted.')) return;
        setProcessing(id);
        try {
            await deleteRequestsApi.approve(id);
            loadRequests();
        } catch {
            setError('Failed to approve request');
        } finally {
            setProcessing(null);
        }
    };

    const handleDeny = async (id: string) => {
        setProcessing(id);
        try {
            await deleteRequestsApi.deny(id);
            loadRequests();
        } catch {
            setError('Failed to deny request');
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string }> = {
            PENDING: { bg: 'rgba(241, 196, 15, 0.1)', color: 'var(--warning)' },
            APPROVED: { bg: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)' },
            DENIED: { bg: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)' },
        };
        const style = styles[status] || styles.PENDING;
        return (
            <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.color,
            }}>
                {status}
            </span>
        );
    };

    if (loading) return <div className="loading-screen">Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Delete Requests</h1>
                    <p className="text-muted">Review and approve/deny session and subject deletion requests from admins</p>
                </div>
            </div>

            {error && <div className="form-error mb-4">{error}</div>}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilter('pending')}
                >
                    Pending ({requests.filter(r => r.status === 'PENDING').length})
                </button>
                <button
                    className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilter('all')}
                >
                    All Requests
                </button>
            </div>

            {requests.length === 0 ? (
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h3>No Pending Requests</h3>
                        <p className="text-muted">All delete requests have been processed</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {requests.map(request => (
                        <div key={request.id} className="card">
                            <div className="card-body">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.625rem',
                                                fontWeight: 600,
                                                backgroundColor: request.type === 'SESSION' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                                                color: request.type === 'SESSION' ? 'var(--primary)' : '#8b5cf6',
                                                textTransform: 'uppercase',
                                            }}>
                                                {request.type}
                                            </span>
                                            {getStatusBadge(request.status)}
                                        </div>
                                        <h3 style={{ marginBottom: '0.25rem' }}>
                                            {request.type === 'SESSION'
                                                ? request.session?.title
                                                : request.subject?.name}
                                        </h3>
                                        {request.type === 'SESSION' && request.session?.subject && (
                                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                                Subject: {request.session.subject.name}
                                            </p>
                                        )}
                                        {request.type === 'SUBJECT' && request.subject && (
                                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                                {request.subject.code} • {request.subject._count?.sessions || 0} sessions will be deleted
                                            </p>
                                        )}
                                        {request.reason && (
                                            <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                                Reason: "{request.reason}"
                                            </p>
                                        )}
                                        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                            Requested by {request.requestedBy.firstName} {request.requestedBy.lastName} ({request.requestedBy.email})
                                            <br />
                                            on {new Date(request.createdAt).toLocaleString()}
                                        </p>
                                        {request.approvedBy && (
                                            <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {request.status === 'APPROVED' ? 'Approved' : 'Denied'} by {request.approvedBy.firstName} {request.approvedBy.lastName}
                                            </p>
                                        )}
                                    </div>
                                    {request.status === 'PENDING' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleApprove(request.id)}
                                                disabled={processing === request.id}
                                            >
                                                {processing === request.id ? '...' : '✓ Approve'}
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleDeny(request.id)}
                                                disabled={processing === request.id}
                                            >
                                                {processing === request.id ? '...' : '✗ Deny'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
