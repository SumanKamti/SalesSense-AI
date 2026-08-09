import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api/v1"
});

/**
 * Send the speaker-separated conversation to Gemini for AI analysis.
 * @param {Array} conversation - Array of {speaker, text} objects
 * @returns {Promise} - Axios response with { analysis: { ... } }
 */
export const analyzeConversation = (conversation) => {
    return api.post("/analysis/analyze", { conversation });
};

export default api;