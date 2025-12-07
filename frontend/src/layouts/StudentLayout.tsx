import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/student/login');
    };

    return (
        <div className="layout">
            <header className="header">
                <div className="header-title">SmartQR</div>
                <nav className="nav">
                    <NavLink
                        to="/student/session"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        📅 Sessions
                    </NavLink>
                    <NavLink
                        to="/student/attendance"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        📊 History
                    </NavLink>
                    <NavLink
                        to="/student/profile"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        👤 Profile
                    </NavLink>
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
                    <span className="text-muted">{user?.firstName}</span>
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
