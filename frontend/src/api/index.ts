import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post(`${API_URL}/api/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: string;
        domainId?: string;
    }) => api.post('/auth/register', data),
    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),
    logout: () => api.post('/auth/logout'),
};

// Subjects API
export const subjectsApi = {
    getAll: (domainId?: string) =>
        api.get('/subjects', { params: { domainId } }),
    getById: (id: string) => api.get(`/subjects/${id}`),
    create: (data: { name: string; code?: string; description?: string; domainId: string }) =>
        api.post('/subjects', data),
    update: (id: string, data: { name?: string; code?: string; description?: string }) =>
        api.patch(`/subjects/${id}`, data),
    delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Sessions API
export const sessionsApi = {
    getAll: (domainId?: string) =>
        api.get('/sessions', { params: { domainId } }),
    getById: (id: string) => api.get(`/sessions/${id}`),
    getActive: () => api.get('/sessions/active'),
    create: (data: { title: string; description?: string; domainId: string; subjectId?: string }) =>
        api.post('/sessions', data),
    update: (id: string, data: { title?: string; description?: string }) =>
        api.patch(`/sessions/${id}`, data),
    start: (id: string) => api.post(`/sessions/${id}/start`),
    switchToExit: (id: string) => api.post(`/sessions/${id}/switch-to-exit`),
    stop: (id: string) => api.post(`/sessions/${id}/stop`),
    cancel: (id: string) => api.post(`/sessions/${id}/cancel`),
    delete: (id: string) => api.delete(`/sessions/${id}`),
    getToken: (id: string) => api.get(`/sessions/${id}/token`),
};

// Attendance API
export const attendanceApi = {
    scan: (data: {
        token: string;
        deviceFp?: string;
        geo?: { country?: string; city?: string; lat?: number; lon?: number };
    }) => api.post('/attendance/scan', data),
    getBySession: (sessionId: string) =>
        api.get(`/attendance/session/${sessionId}`),
    getFlaggedBySession: (sessionId: string) =>
        api.get(`/attendance/session/${sessionId}/flagged`),
    getMyAttendance: () => api.get('/attendance/my'),
    getMyAttendanceGrouped: () => api.get('/attendance/my/grouped'),
};

// Domains API
export const domainsApi = {
    getAll: () => api.get('/domains'),
    getById: (id: string) => api.get(`/domains/${id}`),
    create: (data: { name: string; slug: string }) =>
        api.post('/domains', data),
};

// Users API
export const usersApi = {
    getAll: () => api.get('/users'),
    getById: (id: string) => api.get(`/users/${id}`),
    getByDomain: (domainId: string, role?: string) =>
        api.get(`/users/domain/${domainId}`, { params: { role } }),
    getAdmins: () => api.get('/users/admins'),
    createAdmin: (data: { email: string; firstName: string; lastName: string; tempPassword: string }) =>
        api.post('/users/admin', data),
    createStudent: (data: { email: string; firstName: string; lastName: string; tempPassword: string; domainId?: string }) =>
        api.post('/users/student', data),
    assignPrn: (id: string, prn: string) =>
        api.patch(`/users/${id}/prn`, { prn }),
    deleteWithPassword: (id: string, password: string) =>
        api.post(`/users/${id}/delete`, { password }),
    delete: (id: string) => api.delete(`/users/${id}`),
    activate: (id: string) => api.patch(`/users/${id}/activate`),
    deactivate: (id: string) => api.patch(`/users/${id}/deactivate`),
    updateEmail: (id: string, email: string) => api.patch(`/users/${id}/email`, { email }),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.patch('/users/change-password', { currentPassword, newPassword }),
};

// Profile API (for students/admins)
export const profileApi = {
    get: () => api.get('/profile'),
    update: (data: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        gender?: string;
        nationality?: string;
        phone?: string;
        currentAddress?: string;
        permanentAddress?: string;
        academicMarks?: string;
    }) => api.patch('/profile', data),
};

// Delete Requests API (for session/subject deletion approval)
export const deleteRequestsApi = {
    create: (type: 'SESSION' | 'SUBJECT', targetId: string, reason?: string) =>
        api.post('/delete-requests', { type, targetId, reason }),
    getPending: () => api.get('/delete-requests/pending'),
    getAll: () => api.get('/delete-requests'),
    getMy: () => api.get('/delete-requests/my'),
    approve: (id: string) => api.post(`/delete-requests/${id}/approve`),
    deny: (id: string) => api.post(`/delete-requests/${id}/deny`),
};

