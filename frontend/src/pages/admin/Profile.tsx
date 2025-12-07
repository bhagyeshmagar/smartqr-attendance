import { useEffect, useState } from 'react';
import { profileApi, usersApi } from '../../api';

interface Profile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profileComplete: boolean;
    dateOfBirth: string | null;
    gender: string | null;
    nationality: string | null;
    phone: string | null;
    currentAddress: string | null;
    permanentAddress: string | null;
}

export default function AdminProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

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

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await profileApi.get();
            const data = response.data;
            setProfile(data);
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
        } catch {
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            await profileApi.update(form);
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setSaving(true);
        try {
            await usersApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            setSuccess('Password changed successfully!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-screen">Loading...</div>;
    if (!profile) return <div className="text-center text-muted">Profile not found</div>;

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="page-header">
                <h1 className="page-title">My Profile</h1>
                {activeTab === 'profile' && !isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        ✏️ Edit Profile
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); setIsEditing(false); }}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: activeTab === 'profile' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        borderRadius: '10px',
                    }}
                >
                    👤 Profile Details
                </button>
                <button
                    onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); setIsEditing(false); }}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: activeTab === 'password' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        borderRadius: '10px',
                    }}
                >
                    🔒 Change Password
                </button>
            </div>

            {error && <div className="form-error mb-4">{error}</div>}
            {success && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
                    color: 'var(--success)',
                    borderRadius: 'var(--radius)',
                    marginBottom: '1rem',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                }}>
                    ✓ {success}
                </div>
            )}

            {activeTab === 'profile' ? (
                isEditing ? (
                    <form onSubmit={handleSaveProfile}>
                        {/* Personal Information */}
                        <div className="card mb-4">
                            <div className="card-header">
                                <h3 className="card-title">Personal Information</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">First Name *</label>
                                        <input type="text" className="form-input" value={form.firstName}
                                            onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Last Name *</label>
                                        <input type="text" className="form-input" value={form.lastName}
                                            onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))} required />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input type="tel" className="form-input" value={form.phone}
                                            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="e.g., +91-9876543210" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date of Birth</label>
                                        <input type="date" className="form-input" value={form.dateOfBirth}
                                            onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Gender</label>
                                        <select className="form-input" value={form.gender}
                                            onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}>
                                            <option value="">Select</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nationality</label>
                                        <input type="text" className="form-input" value={form.nationality}
                                            onChange={e => setForm(prev => ({ ...prev, nationality: e.target.value }))}
                                            placeholder="e.g., Indian" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="card mb-4">
                            <div className="card-header">
                                <h3 className="card-title">Address</h3>
                            </div>
                            <div className="card-body">
                                <div className="form-group">
                                    <label className="form-label">Current Address</label>
                                    <textarea className="form-input" rows={2} value={form.currentAddress}
                                        onChange={e => setForm(prev => ({ ...prev, currentAddress: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Permanent Address</label>
                                    <textarea className="form-input" rows={2} value={form.permanentAddress}
                                        onChange={e => setForm(prev => ({ ...prev, permanentAddress: e.target.value }))} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                                {saving ? 'Saving...' : '💾 Save Changes'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => { setIsEditing(false); loadProfile(); }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        {/* View Mode */}
                        <div className="card mb-4">
                            <div className="card-header">
                                <h3 className="card-title">Account Information</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Email</label>
                                        <p style={{ fontWeight: 500 }}>{profile.email}</p>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Role</label>
                                        <p style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                            {profile.role === 'SUPER_ADMIN' ? '👑 Super Admin' : '👔 Admin'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card mb-4">
                            <div className="card-header">
                                <h3 className="card-title">Personal Information</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Full Name</label>
                                        <p style={{ fontWeight: 500 }}>{profile.firstName} {profile.lastName}</p>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Phone</label>
                                        <p style={{ color: profile.phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {profile.phone || 'Not set'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Date of Birth</label>
                                        <p style={{ color: profile.dateOfBirth ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not set'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Gender</label>
                                        <p style={{ color: profile.gender ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {profile.gender || 'Not set'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Address</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Current Address</label>
                                        <p style={{ color: profile.currentAddress ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {profile.currentAddress || 'Not set'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Permanent Address</label>
                                        <p style={{ color: profile.permanentAddress ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {profile.permanentAddress || 'Not set'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            ) : (
                <form onSubmit={handleChangePassword}>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Change Password</h3>
                        </div>
                        <div className="card-body">
                            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                                Enter your current password and choose a new one.
                            </p>
                            <div className="form-group">
                                <label className="form-label">Current Password *</label>
                                <input type="password" className="form-input"
                                    value={passwordForm.currentPassword}
                                    onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Password *</label>
                                <input type="password" className="form-input"
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="At least 6 characters"
                                    required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm New Password *</label>
                                <input type="password" className="form-input"
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    required />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', marginTop: '0.5rem' }}>
                                {saving ? 'Changing...' : '🔒 Change Password'}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
