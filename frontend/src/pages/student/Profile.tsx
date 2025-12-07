import { useEffect, useState } from 'react';
import { profileApi } from '../../api';

interface Profile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    prn: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    nationality: string | null;
    phone: string | null;
    currentAddress: string | null;
    permanentAddress: string | null;
    academicMarks: string | null;
}

interface AcademicMarks {
    '10th': string;
    '12th': string;
    degree: string;
}

export default function Profile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        phone: '',
        currentAddress: '',
        permanentAddress: '',
    });

    const [marks, setMarks] = useState<AcademicMarks>({
        '10th': '',
        '12th': '',
        degree: '',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await profileApi.get();
            const data = response.data;
            setProfile(data);
            populateForm(data);
        } catch {
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const populateForm = (data: Profile) => {
        setForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
            gender: data.gender || '',
            nationality: data.nationality || '',
            phone: data.phone || '',
            currentAddress: data.currentAddress || '',
            permanentAddress: data.permanentAddress || '',
        });

        if (data.academicMarks) {
            try {
                const parsedMarks = JSON.parse(data.academicMarks);
                setMarks({
                    '10th': parsedMarks['10th'] || '',
                    '12th': parsedMarks['12th'] || '',
                    degree: parsedMarks.degree || '',
                });
            } catch {
                // Invalid JSON, use defaults
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const academicMarks = JSON.stringify(marks);
            await profileApi.update({ ...form, academicMarks });
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
            loadProfile();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (profile) populateForm(profile);
        setIsEditing(false);
        setError('');
    };

    if (loading) return <div className="text-center">Loading...</div>;
    if (!profile) return <div className="text-center text-muted">Profile not found</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="page-title" style={{ margin: 0 }}>My Profile</h1>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        ✏️ Edit Profile
                    </button>
                )}
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

            {/* PRN Display (Read-only) */}
            <div className="card mb-4">
                <div className="card-body">
                    <h3 style={{ marginBottom: '1rem' }}>Registration Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Email</label>
                            <p style={{ color: 'var(--text-muted)' }}>{profile.email}</p>
                        </div>
                        <div>
                            <label className="form-label">PRN (Permanent Registration Number)</label>
                            <p style={{ fontWeight: 600, color: profile.prn ? 'var(--primary)' : 'var(--text-muted)' }}>
                                {profile.prn || 'Not assigned yet - Contact admin'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {isEditing ? (
                /* Edit Mode */
                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>Personal Information</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input type="text" className="form-input" value={form.firstName}
                                        onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input type="text" className="form-input" value={form.lastName}
                                        onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input type="date" className="form-input" value={form.dateOfBirth}
                                        onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Gender</label>
                                    <select className="form-input" value={form.gender}
                                        onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Nationality</label>
                                    <input type="text" className="form-input" value={form.nationality}
                                        onChange={e => setForm(prev => ({ ...prev, nationality: e.target.value }))} placeholder="e.g., Indian" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input type="tel" className="form-input" value={form.phone}
                                        onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="e.g., +91-9876543210" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>Address Information</h3>
                            <div className="form-group">
                                <label className="form-label">Current Address</label>
                                <textarea className="form-input" rows={2} value={form.currentAddress}
                                    onChange={e => setForm(prev => ({ ...prev, currentAddress: e.target.value }))} placeholder="Enter your current address" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Permanent Address</label>
                                <textarea className="form-input" rows={2} value={form.permanentAddress}
                                    onChange={e => setForm(prev => ({ ...prev, permanentAddress: e.target.value }))} placeholder="Enter your permanent address" />
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>Academic Information</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">10th Marks (%)</label>
                                    <input type="text" className="form-input" value={marks['10th']}
                                        onChange={e => setMarks(prev => ({ ...prev, '10th': e.target.value }))} placeholder="e.g., 85%" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">12th Marks (%)</label>
                                    <input type="text" className="form-input" value={marks['12th']}
                                        onChange={e => setMarks(prev => ({ ...prev, '12th': e.target.value }))} placeholder="e.g., 90%" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Degree (%)</label>
                                    <input type="text" className="form-input" value={marks.degree}
                                        onChange={e => setMarks(prev => ({ ...prev, degree: e.target.value }))} placeholder="e.g., 75%" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                            {saving ? 'Saving...' : '💾 Save Changes'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleCancel} style={{ flex: 1 }}>
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                /* View Mode */
                <>
                    <div className="card mb-4">
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>Personal Information</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div><label className="form-label">Name</label><p>{profile.firstName} {profile.lastName}</p></div>
                                <div><label className="form-label">Date of Birth</label><p>{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '—'}</p></div>
                                <div><label className="form-label">Gender</label><p>{profile.gender || '—'}</p></div>
                                <div><label className="form-label">Nationality</label><p>{profile.nationality || '—'}</p></div>
                                <div><label className="form-label">Phone</label><p>{profile.phone || '—'}</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="card mb-4">
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>Address</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                <div><label className="form-label">Current</label><p>{profile.currentAddress || '—'}</p></div>
                                <div><label className="form-label">Permanent</label><p>{profile.permanentAddress || '—'}</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="card mb-4">
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>Academic Information</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div><label className="form-label">10th</label><p>{marks['10th'] || '—'}</p></div>
                                <div><label className="form-label">12th</label><p>{marks['12th'] || '—'}</p></div>
                                <div><label className="form-label">Degree</label><p>{marks.degree || '—'}</p></div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
