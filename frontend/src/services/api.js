import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api/v1",
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
    getMe: () => api.get("/auth/me"),
};

/**
 * History API calls  
 */
export const historyAPI = {
    list: () => api.get("/history/"),
    get: (id) => api.get(`/history/${id}`),
    delete: (id) => api.delete(`/history/${id}`),
};

export default api;