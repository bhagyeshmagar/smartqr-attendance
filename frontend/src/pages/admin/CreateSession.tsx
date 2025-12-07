import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi, domainsApi } from '../../api';

interface Domain {
    id: string;
    name: string;
    slug: string;
}

export default function CreateSession() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [domainId, setDomainId] = useState('');
    const [domains, setDomains] = useState<Domain[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadDomains();
    }, []);

    const loadDomains = async () => {
        try {
            const response = await domainsApi.getAll();
            setDomains(response.data);
            if (response.data.length > 0) {
                setDomainId(response.data[0].id);
            }
        } catch {
            setError('Failed to load domains');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await sessionsApi.create({ title, description, domainId });
            navigate(`/admin/sessions/${response.data.id}`);
        } catch {
            setError('Failed to create session');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
            <div className="page-header w-full max-w-lg mb-6">
                <h1 className="page-title text-center w-full">Create Session</h1>
            </div>

            <div className="card w-full max-w-lg">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {error && <div className="form-error mb-4">{error}</div>}

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

                        <div className="flex gap-3 mt-8 justify-end">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/admin/sessions')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating...' : 'Create Session'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
