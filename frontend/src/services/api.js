import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1",
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("salessense_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("salessense_token");
            localStorage.removeItem("salessense_user");
            // Only redirect if not already on login page
            if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Send the speaker-separated conversation to Gemini for AI analysis.
 */
export const analyzeConversation = (conversation, conversationId = null) => {
    return api.post("/analysis/analyze", {
        conversation,
        conversation_id: conversationId,
    });
};

/**
 * Auth API calls
 */
export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    logout: () => api.post("/auth/logout"),
    getMe: () => api.get("/auth/me"),
    forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
    resetPassword: (token, newPassword) => api.post("/auth/reset-password", { token, new_password: newPassword }),
};

/**
 * Organization & Team Management API calls
 */
export const orgAPI = {
    get: () => api.get("/organization/"),
    getTeam: () => api.get("/organization/team"),
    getStats: () => api.get("/organization/stats"),
    createInvite: (data) => api.post("/organization/invite", data),
    getInvitations: () => api.get("/organization/invitations"),
    revokeInvite: (id) => api.delete(`/organization/invite/${id}`),
    updateRole: (userId, role) => api.put(`/organization/team/${userId}/role`, { role }),
    removeMember: (userId) => api.delete(`/organization/team/${userId}`),
};

/**
 * History API calls
 */
export const historyAPI = {
    list: (repId = null, page = 1, pageSize = 20) => {
        const params = {};
        if (repId) params.rep_id = repId;
        params.page = page;
        params.page_size = pageSize;
        return api.get("/history/", { params });
    },
    get: (id) => api.get(`/history/${id}`),
    delete: (id) => api.delete(`/history/${id}`),
};

/**
 * Analytics API calls
 */
export const analyticsAPI = {
    getDashboard: (days = 30) => api.get("/analytics/dashboard", { params: { days } }),
};

/**
 * Export & Compliance API calls
 */
export const exportAPI = {
    exportCallCSV: (id) => api.get(`/export/call/${id}/csv`, { responseType: "blob" }),
    exportCallPDF: (id) => api.get(`/export/call/${id}/pdf`, { responseType: "blob" }),
    exportHistoryCSV: () => api.get("/export/history/csv", { responseType: "blob" }),
    exportMyData: () => api.get("/export/my-data", { responseType: "blob" }),
    deleteMyData: () => api.delete("/export/my-data"),
    getAuditLog: () => api.get("/export/audit-log"),
};

export default api;