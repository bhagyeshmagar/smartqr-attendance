import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <header className="header">
                <div className="header-title">SmartQR</div>
                <nav className="nav">
                    <NavLink
                        to="/admin/subjects"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        📚 Subjects
                    </NavLink>
                    <NavLink
                        to="/admin/sessions"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        📋 Sessions
                    </NavLink>
                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        👥 Users
                    </NavLink>
                    {isSuperAdmin && (
                        <NavLink
                            to="/admin/delete-requests"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            📨 Requests
                        </NavLink>
                    )}
                </nav>
                <div className="flex items-center gap-4">
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        <span className="theme-toggle-icon">
                            {theme === 'light' ? '🌙' : '☀️'}
                        </span>
                    </button>
                    <NavLink
                        to="/admin/profile"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                        👤 {user?.firstName}
                        {isSuperAdmin && <span style={{ fontSize: '0.625rem', color: 'var(--primary)', marginLeft: '0.25rem' }}>(Super)</span>}
                    </NavLink>
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
