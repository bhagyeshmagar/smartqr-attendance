import { useEffect, useState } from 'react';
import { usersApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    prn: string | null;
    isActive: boolean;
    profileComplete: boolean;
    dateOfBirth: string | null;
    gender: string | null;
    nationality: string | null;
    phone: string | null;
    createdAt: string;
    domain?: { id: string; name: string; slug: string };
}

export default function Users() {
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    const [users, setUsers] = useState<User[]>([]);
    const [admins, setAdmins] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'students' | 'admins'>('students');

    // Create Admin Modal
    const [adminModal, setAdminModal] = useState({
        open: false,
        email: '',
        firstName: '',
        lastName: '',
        tempPassword: '',
    });

    // Create Student Modal
    const [studentModal, setStudentModal] = useState({
        open: false,
        email: '',
        firstName: '',
        lastName: '',
        tempPassword: '',
    });

    // PRN Modal state
    const [prnModal, setPrnModal] = useState<{ open: boolean; user: User | null; prn: string }>({
        open: false,
        user: null,
        prn: '',
    });

    // Delete Modal state
    const [deleteModal, setDeleteModal] = useState<{
        open: boolean;
        user: User | null;
        step: 'confirm' | 'password';
        password: string;
    }>({
        open: false,
        user: null,
        step: 'confirm',
        password: '',
    });

    // Email Modal state
    const [emailModal, setEmailModal] = useState<{ open: boolean; user: User | null; email: string }>({
        open: false,
        user: null,
        email: '',
    });

    const [actionError, setActionError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes] = await Promise.all([usersApi.getAll()]);
            const allUsers = usersRes.data;
            setUsers(allUsers.filter((u: User) => u.role === 'STUDENT'));
            setAdmins(allUsers.filter((u: User) => u.role === 'ADMIN'));
        } catch {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async () => {
        if (!adminModal.email || !adminModal.firstName || !adminModal.lastName || !adminModal.tempPassword) return;
        setActionError('');
        setSaving(true);

        try {
            await usersApi.createAdmin({
                email: adminModal.email,
                firstName: adminModal.firstName,
                lastName: adminModal.lastName,
                tempPassword: adminModal.tempPassword,
            });
            setAdminModal({ open: false, email: '', firstName: '', lastName: '', tempPassword: '' });
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setActionError(error.response?.data?.message || 'Failed to create admin');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateStudent = async () => {
        if (!studentModal.email || !studentModal.firstName || !studentModal.lastName || !studentModal.tempPassword) return;
        setActionError('');
        setSaving(true);

        try {
            await usersApi.createStudent({
                email: studentModal.email,
                firstName: studentModal.firstName,
                lastName: studentModal.lastName,
                tempPassword: studentModal.tempPassword,
            });
            setStudentModal({ open: false, email: '', firstName: '', lastName: '', tempPassword: '' });
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setActionError(error.response?.data?.message || 'Failed to create student');
        } finally {
            setSaving(false);
        }
    };

    const handleAssignPrn = async () => {
        if (!prnModal.user || !prnModal.prn.trim()) return;
        setActionError('');

        try {
            await usersApi.assignPrn(prnModal.user.id, prnModal.prn.trim());
            setPrnModal({ open: false, user: null, prn: '' });
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setActionError(error.response?.data?.message || 'Failed to assign PRN');
        }
    };

    const handleUpdateEmail = async () => {
        if (!emailModal.user || !emailModal.email.trim()) return;
        setActionError('');
        setSaving(true);

        try {
            await usersApi.updateEmail(emailModal.user.id, emailModal.email.trim());
            setEmailModal({ open: false, user: null, email: '' });
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setActionError(error.response?.data?.message || 'Failed to update email');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConfirm = () => {
        setDeleteModal(prev => ({ ...prev, step: 'password' }));
    };

    const handleDeleteWithPassword = async () => {
        if (!deleteModal.user || !deleteModal.password) return;
        setActionError('');

        try {
            await usersApi.deleteWithPassword(deleteModal.user.id, deleteModal.password);
            setDeleteModal({ open: false, user: null, step: 'confirm', password: '' });
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setActionError(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleToggleStatus = async (user: User) => {
        // Check if admin is trying to modify non-student
        if (!isSuperAdmin && user.role !== 'STUDENT') {
            setError('You can only manage students');
            return;
        }

        try {
            if (user.isActive) {
                await usersApi.deactivate(user.id);
            } else {
                await usersApi.activate(user.id);
            }
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to update user status');
        }
    };

    const canManageUser = (user: User) => {
        if (isSuperAdmin) return user.role !== 'SUPER_ADMIN';
        return user.role === 'STUDENT';
    };

    if (loading) return <div className="text-center">Loading...</div>;

    const displayUsers = activeTab === 'students' ? users : admins;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="text-muted">
                        {isSuperAdmin ? 'Manage students and admins' : 'Manage students'}
                    </p>
                </div>
                {isSuperAdmin && activeTab === 'admins' && (
                    <button className="btn btn-primary" onClick={() => setAdminModal({ ...adminModal, open: true })}>
                        + Add Admin
                    </button>
                )}
                {activeTab === 'students' && (
                    <button className="btn btn-primary" onClick={() => setStudentModal({ ...studentModal, open: true })}>
                        + Add Student
                    </button>
                )}
            </div>

            {error && <div className="form-error mb-4">{error}</div>}

            {/* Tabs (only for Super Admin) */}
            {isSuperAdmin && (
                <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', borderBottom: '2px solid var(--border-color)' }}>
                    <button
                        onClick={() => setActiveTab('students')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            background: activeTab === 'students' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'students' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            borderRadius: '8px 8px 0 0',
                        }}
                    >
                        👤 Students ({users.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('admins')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            background: activeTab === 'admins' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'admins' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            borderRadius: '8px 8px 0 0',
                        }}
                    >
                        👔 Admins ({admins.length})
                    </button>
                </div>
            )}

            <div className="card">
                <div className="card-body" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Email</th>
                                {activeTab === 'students' && <th style={thStyle}>PRN</th>}
                                <th style={thStyle}>Status</th>
                                {activeTab === 'admins' && <th style={thStyle}>Profile</th>}
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}>
                                        {user.firstName} {user.lastName}
                                    </td>
                                    <td style={tdStyle}>{user.email}</td>
                                    {activeTab === 'students' && (
                                        <td style={tdStyle}>
                                            {user.prn || (
                                                <span style={{ color: 'var(--text-muted)' }}>Not assigned</span>
                                            )}
                                        </td>
                                    )}
                                    <td style={tdStyle}>
                                        <span style={{ color: user.isActive ? 'var(--success)' : 'var(--danger)' }}>
                                            {user.isActive ? '● Active' : '○ Inactive'}
                                        </span>
                                    </td>
                                    {activeTab === 'admins' && (
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '0.125rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                backgroundColor: user.profileComplete ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)',
                                                color: user.profileComplete ? 'var(--success)' : 'var(--warning)',
                                            }}>
                                                {user.profileComplete ? 'Complete' : 'Incomplete'}
                                            </span>
                                        </td>
                                    )}
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {activeTab === 'students' && (
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                    onClick={() => setPrnModal({ open: true, user, prn: user.prn || '' })}
                                                >
                                                    {user.prn ? 'Edit PRN' : 'Assign PRN'}
                                                </button>
                                            )}
                                            {canManageUser(user) && (
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--info)' }}
                                                    onClick={() => setEmailModal({ open: true, user, email: user.email })}
                                                >
                                                    Edit Email
                                                </button>
                                            )}
                                            {canManageUser(user) && (
                                                <>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: user.isActive ? 'var(--warning)' : 'var(--success)',
                                                        }}
                                                        onClick={() => handleToggleStatus(user)}
                                                    >
                                                        {user.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                        onClick={() => setDeleteModal({ open: true, user, step: 'confirm', password: '' })}
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {displayUsers.length === 0 && (
                        <p className="text-center text-muted" style={{ padding: '2rem' }}>
                            No {activeTab} found
                        </p>
                    )}
                </div>
            </div>

            {/* Create Admin Modal */}
            {adminModal.open && (
                <div style={modalOverlay}>
                    <div className="card" style={modalCard}>
                        <div className="card-header">
                            <h3 className="card-title">Create New Admin</h3>
                        </div>
                        <div className="card-body">
                            {actionError && <div className="form-error mb-4">{actionError}</div>}
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={adminModal.email}
                                    onChange={e => setAdminModal(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={adminModal.firstName}
                                        onChange={e => setAdminModal(prev => ({ ...prev, firstName: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={adminModal.lastName}
                                        onChange={e => setAdminModal(prev => ({ ...prev, lastName: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Temporary Password *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={adminModal.tempPassword}
                                    onChange={e => setAdminModal(prev => ({ ...prev, tempPassword: e.target.value }))}
                                    placeholder="Admin can change this later"
                                />
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                                The admin will need to complete their profile and change their password after first login.
                            </p>
                        </div>
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setAdminModal({ open: false, email: '', firstName: '', lastName: '', tempPassword: '' });
                                    setActionError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateAdmin} disabled={saving}>
                                {saving ? 'Creating...' : 'Create Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Student Modal */}
            {studentModal.open && (
                <div style={modalOverlay}>
                    <div className="card" style={modalCard}>
                        <div className="card-header">
                            <h3 className="card-title">Add New Student</h3>
                        </div>
                        <div className="card-body">
                            {actionError && <div className="form-error mb-4">{actionError}</div>}
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={studentModal.email}
                                    onChange={e => setStudentModal(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="student@example.com"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={studentModal.firstName}
                                        onChange={e => setStudentModal(prev => ({ ...prev, firstName: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={studentModal.lastName}
                                        onChange={e => setStudentModal(prev => ({ ...prev, lastName: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Temporary Password *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={studentModal.tempPassword}
                                    onChange={e => setStudentModal(prev => ({ ...prev, tempPassword: e.target.value }))}
                                    placeholder="Student can change this later"
                                />
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                                The student will need to change their password after first login.
                            </p>
                        </div>
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setStudentModal({ open: false, email: '', firstName: '', lastName: '', tempPassword: '' });
                                    setActionError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateStudent} disabled={saving}>
                                {saving ? 'Creating...' : 'Add Student'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRN Assignment Modal */}
            {prnModal.open && (
                <div style={modalOverlay}>
                    <div className="card" style={modalCard}>
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>
                                Assign PRN to {prnModal.user?.firstName} {prnModal.user?.lastName}
                            </h3>
                            {actionError && <div className="form-error mb-4">{actionError}</div>}
                            <div className="form-group">
                                <label className="form-label">Permanent Registration Number (PRN)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={prnModal.prn}
                                    onChange={e => setPrnModal(prev => ({ ...prev, prn: e.target.value }))}
                                    placeholder="Enter PRN"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-primary" onClick={handleAssignPrn}>
                                    Save PRN
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setPrnModal({ open: false, user: null, prn: '' });
                                        setActionError('');
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Edit Modal */}
            {emailModal.open && (
                <div style={modalOverlay}>
                    <div className="card" style={modalCard}>
                        <div className="card-body">
                            <h3 style={{ marginBottom: '1rem' }}>
                                Edit Email for {emailModal.user?.firstName} {emailModal.user?.lastName}
                            </h3>
                            {actionError && <div className="form-error mb-4">{actionError}</div>}
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={emailModal.email}
                                    onChange={e => setEmailModal(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="Enter new email"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-primary" onClick={handleUpdateEmail} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Email'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setEmailModal({ open: false, user: null, email: '' });
                                        setActionError('');
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div style={modalOverlay}>
                    <div className="card" style={modalCard}>
                        <div className="card-body">
                            {deleteModal.step === 'confirm' ? (
                                <>
                                    <h3 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>
                                        Delete {deleteModal.user?.role === 'ADMIN' ? 'Admin' : 'User'}?
                                    </h3>
                                    <p>
                                        Are you sure you want to delete{' '}
                                        <strong>
                                            {deleteModal.user?.firstName} {deleteModal.user?.lastName}
                                        </strong>
                                        ?
                                    </p>
                                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        This action cannot be undone.
                                    </p>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                                            Yes, Delete
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setDeleteModal({ open: false, user: null, step: 'confirm', password: '' });
                                                setActionError('');
                                            }}
                                        >
                                            No, Cancel
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 style={{ marginBottom: '1rem' }}>Enter Your Password</h3>
                                    <p>To confirm deletion, please enter your password:</p>
                                    {actionError && <div className="form-error mb-4">{actionError}</div>}
                                    <div className="form-group">
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={deleteModal.password}
                                            onChange={e => setDeleteModal(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Enter your password"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button className="btn btn-danger" onClick={handleDeleteWithPassword}>
                                            Confirm Delete
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setDeleteModal({ open: false, user: null, step: 'confirm', password: '' });
                                                setActionError('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
};

const tdStyle: React.CSSProperties = {
    padding: '0.75rem',
    verticalAlign: 'middle',
};

const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const modalCard: React.CSSProperties = {
    maxWidth: '500px',
    width: '90%',
};
