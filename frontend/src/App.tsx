import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Admin pages
import UserLogin from './pages/admin/Login';
import AdminSessions from './pages/admin/Sessions';
import SessionDetail from './pages/admin/SessionDetail';
import CreateSession from './pages/admin/CreateSession';
import AdminUsers from './pages/admin/Users';
import AdminSubjects from './pages/admin/Subjects';
import SubjectDetail from './pages/admin/SubjectDetail';
import DeleteRequests from './pages/admin/DeleteRequests';
import AdminProfile from './pages/admin/Profile';

// Student pages
import CurrentSession from './pages/student/CurrentSession';
import SessionScanner from './pages/student/SessionScanner';
import Confirmation from './pages/student/Confirmation';
import MyAttendance from './pages/student/MyAttendance';
import StudentProfile from './pages/student/Profile';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

function ProtectedRoute({
    children,
    allowedRoles
}: {
    children: React.ReactNode;
    allowedRoles?: string[];
}) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<UserLogin />} />

            {/* Admin routes */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/admin/subjects" replace />} />
                <Route path="subjects" element={<AdminSubjects />} />
                <Route path="subjects/:id" element={<SubjectDetail />} />
                <Route path="sessions" element={<AdminSessions />} />
                <Route path="sessions/create" element={<CreateSession />} />
                <Route path="sessions/:id" element={<SessionDetail />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="delete-requests" element={<DeleteRequests />} />
                <Route path="profile" element={<AdminProfile />} />
            </Route>

            {/* Student routes */}
            <Route
                path="/student"
                element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/student/session" replace />} />
                <Route path="session" element={<CurrentSession />} />
                <Route path="session/:id/scan" element={<SessionScanner />} />
                <Route path="confirmation" element={<Confirmation />} />
                <Route path="attendance" element={<MyAttendance />} />
                <Route path="profile" element={<StudentProfile />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function RoleBasedRedirect() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === 'STUDENT') {
        return <Navigate to="/student/session" replace />;
    }

    return <Navigate to="/admin/subjects" replace />;
}

export default App;
