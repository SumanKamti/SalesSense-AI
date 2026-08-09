import { useState } from "react";
import { analyzeConversation } from "../services/api";

function ScoreRing({ score }) {
    const radius = 48;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let strokeColor = "#dc2626"; // red
    let ratingLabel = "Needs Coaching";
    let ratingColorClass = "score-low";

    if (score >= 75) {
        strokeColor = "#10b981"; // emerald
        ratingLabel = "Strong Call";
        ratingColorClass = "score-high";
    } else if (score >= 50) {
        strokeColor = "#f59e0b"; // amber
        ratingLabel = "Satisfactory";
        ratingColorClass = "score-mid";
    }

    return (
        <div className="score-ring-container">
            <div className="score-ring-visual">
                <svg width="120" height="120" viewBox="0 0 120 120" className="score-ring-svg">
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        transform="rotate(-90 60 60)"
                        className="score-ring-progress"
                    />
                </svg>
                <div className="score-ring-center">
                    <span className="score-number">{score}</span>
                    <span className="score-max">/100</span>
                </div>
            </div>
            <div className={`score-rating-tag ${ratingColorClass}`}>
                {ratingLabel}
            </div>
        </div>
    );
}

function SentimentPill({ sentiment }) {
    const s = (sentiment || "Neutral").toLowerCase();

    let config = {
        label: "Neutral",
        className: "sentiment-neutral",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="15" x2="16" y2="15" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
        ),
    };

    if (s.includes("positive")) {
        config = {
            label: "Positive",
            className: "sentiment-positive",
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
            ),
        };
    } else if (s.includes("negative")) {
        config = {
            label: "Negative",
            className: "sentiment-negative",
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
            ),
        };
    }

    return (
        <div className={`sentiment-pill ${config.className}`}>
            {config.icon}
            <span>{sentiment || config.label}</span>
        </div>
    );
}

function AnalysisCard({ conversation }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!conversation || conversation.length === 0) {
        return null;
    }

    const handleAnalyze = async () => {
        setError(null);
        setLoading(true);

        try {
            const payload = conversation.map((turn) => ({
                speaker: turn.speaker,
                text: turn.text,
            }));

            const response = await analyzeConversation(payload);
            setAnalysis(response.data.analysis);
        } catch (err) {
            console.error("Analysis error:", err);
            setError(
                err.response?.data?.detail ||
                "Unable to complete conversation analysis. Please check your backend and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card analysis-card">
            {!analysis && (
                <div className="analysis-cta">
                    <div className="cta-content">
                        <div className="cta-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="cta-title">Generate AI Sales Evaluation</h3>
                            <p className="cta-description">
                                Analyze sales rep execution, customer objections, strengths, and targeted coaching tips.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={loading}
                        className={`btn-primary ${loading ? "btn-loading" : ""}`}
                    >
                        {loading ? (
                            <>
                                <span className="btn-spinner"></span>
                                <span>Evaluating Conversation...</span>
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                                <span>Run AI Evaluation</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {error && (
                <div className="alert-box alert-error">
                    <div className="alert-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div className="alert-content">{error}</div>
                    <button type="button" onClick={() => setError(null)} className="alert-close" aria-label="Dismiss">
                        ✕
                    </button>
                </div>
            )}

            {analysis && (
                <div className="analysis-results">
                    <div className="card-header analysis-top-header">
                        <div>
                            <h2 className="card-title">Performance & Coaching Report</h2>
                            <p className="card-description">AI-powered evaluation of conversation tactics and outcome</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="btn-secondary btn-sm"
                            title="Re-run conversation evaluation"
                        >
                            {loading ? (
                                <span className="btn-spinner btn-spinner-dark"></span>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                            )}
                            {loading ? "Evaluating..." : "Re-evaluate"}
                        </button>
                    </div>

                    {/* Score and Sentiment KPI Overview */}
                    <div className="kpi-grid">
                        <div className="kpi-card score-kpi">
                            <span className="kpi-label">Sales Performance Score</span>
                            <ScoreRing score={analysis.sales_score} />
                        </div>
                        <div className="kpi-card sentiment-kpi">
                            <span className="kpi-label">Customer Sentiment</span>
                            <SentimentPill sentiment={analysis.sentiment} />
                            <p className="kpi-subtext">Overall emotional tone of the prospect throughout the discussion.</p>
                        </div>
                    </div>

                    {/* Executive Summary */}
                    {analysis.summary && (
                        <div className="insight-section summary-section">
                            <div className="insight-header">
                                <div className="insight-icon icon-summary">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                </div>
                                <h3 className="insight-title">Executive Summary</h3>
                            </div>
                            <p className="summary-text">{analysis.summary}</p>
                        </div>
                    )}

                    {/* Strengths & Weaknesses Grid */}
                    <div className="insights-grid">
                        {/* Strengths */}
                        {analysis.strengths && analysis.strengths.length > 0 && (
                            <div className="insight-section strengths-section">
                                <div className="insight-header">
                                    <div className="insight-icon icon-strength">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <h3 className="insight-title">Demonstrated Strengths</h3>
                                </div>
                                <ul className="insight-list">
                                    {analysis.strengths.map((item, idx) => (
                                        <li key={idx} className="insight-item strength-item">
                                            <span className="bullet-indicator bullet-strength"></span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Weaknesses / Opportunities */}
                        {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                            <div className="insight-section weaknesses-section">
                                <div className="insight-header">
                                    <div className="insight-icon icon-weakness">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                    </div>
                                    <h3 className="insight-title">Areas to Improve</h3>
                                </div>
                                <ul className="insight-list">
                                    {analysis.weaknesses.map((item, idx) => (
                                        <li key={idx} className="insight-item weakness-item">
                                            <span className="bullet-indicator bullet-weakness"></span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Actionable Coaching Suggestions */}
                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                        <div className="insight-section suggestions-section">
                            <div className="insight-header">
                                <div className="insight-icon icon-suggestion">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2v1" />
                                        <path d="M12 21v1" />
                                        <path d="M4.22 4.22l.71.71" />
                                        <path d="M18.36 18.36l.71.71" />
                                        <path d="M1 12h2" />
                                        <path d="M21 12h2" />
                                        <path d="M4.22 19.78l.71-.71" />
                                        <path d="M18.36 5.64l.71-.71" />
                                        <circle cx="12" cy="12" r="5" />
                                    </svg>
                                </div>
                                <h3 className="insight-title">Actionable Coaching Recommendations</h3>
                            </div>
                            <ul className="insight-list suggestions-list">
                                {analysis.suggestions.map((item, idx) => (
                                    <li key={idx} className="insight-item suggestion-item">
                                        <span className="suggestion-badge">{idx + 1}</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AnalysisCard;
