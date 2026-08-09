import { useState } from "react";
import { analyzeConversation } from "../services/api";

function ScoreCircle({ score }) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let color = "#ef4444"; // red
    if (score >= 70) color = "#22c55e"; // green
    else if (score >= 40) color = "#f59e0b"; // amber

    return (
        <div className="score-circle-wrapper">
            <svg width="130" height="130" viewBox="0 0 130 130">
                <circle
                    cx="65" cy="65" r={radius}
                    fill="none" stroke="#e5e7eb" strokeWidth="10"
                />
                <circle
                    cx="65" cy="65" r={radius}
                    fill="none" stroke={color} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 65 65)"
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                />
            </svg>
            <div className="score-value">
                <span className="score-number">{score}</span>
                <span className="score-label">/ 100</span>
            </div>
        </div>
    );
}

function SentimentBadge({ sentiment }) {
    const classMap = {
        Positive: "sentiment-positive",
        Neutral: "sentiment-neutral",
        Negative: "sentiment-negative",
    };
    const emojiMap = {
        Positive: "😊",
        Neutral: "😐",
        Negative: "😟",
    };

    return (
        <span className={`sentiment-badge ${classMap[sentiment] || "sentiment-neutral"}`}>
            {emojiMap[sentiment] || "😐"} {sentiment}
        </span>
    );
}

function AnalysisCard({ conversation }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Don't render anything if there's no conversation yet
    if (!conversation || conversation.length === 0) {
        return null;
    }

    const handleAnalyze = async () => {
        setError(null);
        setLoading(true);

        try {
            // Send the conversation as-is (with speaker/text keys)
            const payload = conversation.map((turn) => ({
                speaker: turn.speaker,
                text: turn.text,
            }));

            const response = await analyzeConversation(payload);
            setAnalysis(response.data.analysis);
        } catch (err) {
            console.error("Gemini analysis error:", err);
            setError(
                err.response?.data?.detail ||
                "Unable to analyze the conversation. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card analysis-card">
            {/* Button — always visible when conversation exists */}
            {!analysis && (
                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className={`gemini-btn ${loading ? "loading-btn" : ""}`}
                >
                    {loading && <span className="spinner"></span>}
                    {loading ? "Analyzing with Gemini..." : "✨ Analyze with Gemini"}
                </button>
            )}

            {/* Error */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)} className="error-close">✕</button>
                </div>
            )}

            {/* Results */}
            {analysis && (
                <div className="analysis-results">
                    <h2>🤖 AI Conversation Analysis</h2>

                    {/* Score + Sentiment Row */}
                    <div className="analysis-header-row">
                        <div className="analysis-score-section">
                            <h3>Sales Score</h3>
                            <ScoreCircle score={analysis.sales_score} />
                        </div>
                        <div className="analysis-sentiment-section">
                            <h3>Customer Sentiment</h3>
                            <SentimentBadge sentiment={analysis.sentiment} />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="analysis-section">
                        <h3>📝 Summary</h3>
                        <p className="analysis-summary">{analysis.summary}</p>
                    </div>

                    {/* Strengths */}
                    <div className="analysis-section">
                        <h3>💪 Strengths</h3>
                        <ul className="analysis-list strengths-list">
                            {analysis.strengths.map((item, i) => (
                                <li key={i}>
                                    <span className="list-icon strength-icon">✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="analysis-section">
                        <h3>⚡ Areas to Improve</h3>
                        <ul className="analysis-list weaknesses-list">
                            {analysis.weaknesses.map((item, i) => (
                                <li key={i}>
                                    <span className="list-icon weakness-icon">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Suggestions */}
                    <div className="analysis-section">
                        <h3>💡 AI Suggestions</h3>
                        <ul className="analysis-list suggestions-list">
                            {analysis.suggestions.map((item, i) => (
                                <li key={i}>
                                    <span className="list-icon suggestion-icon">→</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Re-analyze button */}
                    <button
                        onClick={() => {
                            setAnalysis(null);
                            handleAnalyze();
                        }}
                        disabled={loading}
                        className={`gemini-btn reanalyze-btn ${loading ? "loading-btn" : ""}`}
                    >
                        {loading && <span className="spinner"></span>}
                        {loading ? "Re-analyzing..." : "🔄 Re-analyze"}
                    </button>
                </div>
            )}
        </div>
    );
}

export default AnalysisCard;
