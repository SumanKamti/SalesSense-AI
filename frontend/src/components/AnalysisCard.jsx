import { useState, useEffect, useMemo } from "react";
import { analyzeConversation } from "../services/api";
import QuickAnalysisModal from "./QuickAnalysisModal";

function parseQuickSummary(summaryText) {
    if (!summaryText) return [];
    const sentences = summaryText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
        .filter((s) => s.length > 5);

    if (sentences.length === 0) return [];
    if (sentences.length === 1) {
        return [{ label: "Key Takeaway", icon: "📌", text: sentences[0] }];
    }
    if (sentences.length === 2) {
        return [
            { label: "Call Intent", icon: "📞", text: sentences[0] },
            { label: "Resolution", icon: "✅", text: sentences[1] },
        ];
    }
    return [
        { label: "Call Intent", icon: "📞", text: sentences[0] },
        { label: "Key Exchange", icon: "💬", text: sentences[1] },
        { label: "Resolution", icon: "🏁", text: sentences[2] },
    ];
}

function toShortBullet(text, maxWords = 13) {
    if (!text) return "";
    const cleaned = text.trim().replace(/^[-•*]\s*/, "");
    const words = cleaned.split(/\s+/);
    if (words.length <= maxWords) return cleaned;
    return words.slice(0, maxWords).join(" ") + "...";
}

function ScoreRing({ score }) {
    const radius = 48;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let strokeColor = "var(--danger)"; // red
    let ratingLabel = "Needs Coaching";
    let ratingColorClass = "score-low";

    if (score >= 75) {
        strokeColor = "var(--success)"; // emerald
        ratingLabel = "Strong Call";
        ratingColorClass = "score-high";
    } else if (score >= 50) {
        strokeColor = "var(--warning)"; // amber
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
                        stroke="var(--border-subtle)"
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

function SubScoreBar({ label, score }) {
    let barColor = "var(--danger)";
    if (score >= 75) barColor = "var(--success)";
    else if (score >= 50) barColor = "var(--warning)";

    return (
        <div className="sub-score-row">
            <div className="sub-score-header">
                <span className="sub-score-label">{label}</span>
                <span className="sub-score-val">{score}%</span>
            </div>
            <div className="sub-score-track">
                <div
                    className="sub-score-fill"
                    style={{ width: `${score}%`, backgroundColor: barColor }}
                />
            </div>
        </div>
    );
}

function AnalysisCard({ conversation, conversationId = null, savedAnalysis = null }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("overview"); // "overview" | "coaching" | "actions" | "quick" | "all"
    const [copiedSummary, setCopiedSummary] = useState(false);
    const [copiedCoaching, setCopiedCoaching] = useState(false);
    const [copiedFull, setCopiedFull] = useState(false);
    const [showQuickModal, setShowQuickModal] = useState(false);

    // Calculate talk-time ratio from conversation turns
    const talkStats = useMemo(() => {
        if (!conversation || conversation.length === 0) {
            return { agentPct: 50, prospectPct: 50, status: "Balanced" };
        }

        let agentWords = 0;
        let prospectWords = 0;

        for (const turn of conversation) {
            const role = (turn.role || "").toLowerCase();
            const wordCount = (turn.text || "").trim().split(/\s+/).filter(Boolean).length;
            if (role.includes("prospect") || role.includes("customer") || role.includes("buyer")) {
                prospectWords += wordCount;
            } else {
                agentWords += wordCount;
            }
        }

        const totalWords = agentWords + prospectWords;
        if (totalWords === 0) {
            return { agentPct: 50, prospectPct: 50, status: "Balanced" };
        }

        const agentPct = Math.round((agentWords / totalWords) * 100);
        const prospectPct = 100 - agentPct;

        let status = "Healthy Balance";
        if (agentPct > 65) {
            status = "Agent Dominating (>65%)";
        } else if (agentPct < 35) {
            status = "Prospect Leading (>65%)";
        }

        return { agentPct, prospectPct, status };
    }, [conversation]);

    useEffect(() => {
        if (savedAnalysis) {
            setAnalysis(savedAnalysis);
        }
    }, [savedAnalysis]);

    // Derive calculated competency sub-scores based on overall score & strengths/weaknesses counts
    const subScores = useMemo(() => {
        if (!analysis || !analysis.sales_score) return null;
        const base = analysis.sales_score;
        const strengthsCount = (analysis.strengths || []).length;
        const weaknessesCount = (analysis.weaknesses || []).length;
        const boost = Math.min(10, strengthsCount * 2);
        const penalty = Math.min(12, weaknessesCount * 3);

        return [
            { label: "Opening & Rapport", score: Math.min(100, Math.max(30, base + boost - 4)) },
            { label: "Value Proposition", score: Math.min(100, Math.max(35, base + 2)) },
            { label: "Objection Handling", score: Math.min(100, Math.max(25, base - penalty + 4)) },
            { label: "Closing & Next Steps", score: Math.min(100, Math.max(30, base - 3)) },
        ];
    }, [analysis]);

    if (!conversation || conversation.length === 0) {
        return null;
    }

    const handleAnalyze = async () => {
        setError(null);
        setLoading(true);

        try {
            const payload = conversation.map((turn) => ({
                speaker: turn.speaker,
                role: turn.role,
                text: turn.text,
            }));

            const response = await analyzeConversation(payload, conversationId);
            setAnalysis(response.data.analysis);
            setActiveTab("overview");
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

    const copySummary = async () => {
        if (!analysis?.summary) return;
        try {
            await navigator.clipboard.writeText(analysis.summary);
            setCopiedSummary(true);
            setTimeout(() => setCopiedSummary(false), 2000);
        } catch (e) {}
    };

    const copyCoaching = async () => {
        if (!analysis?.suggestions) return;
        const text = analysis.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n");
        try {
            await navigator.clipboard.writeText(text);
            setCopiedCoaching(true);
            setTimeout(() => setCopiedCoaching(false), 2000);
        } catch (e) {}
    };

    const copyFullReport = async () => {
        if (!analysis) return;
        const lines = [
            `# SalesSense AI Performance Report`,
            `Overall Score: ${analysis.sales_score}/100`,
            `Customer Sentiment: ${analysis.sentiment}`,
            `\n## Executive Summary`,
            analysis.summary || "",
            `\n## Demonstrated Strengths`,
            ...(analysis.strengths || []).map((s) => `- ${s}`),
            `\n## Areas to Improve`,
            ...(analysis.weaknesses || []).map((w) => `- ${w}`),
            `\n## Actionable Coaching Recommendations`,
            ...(analysis.suggestions || []).map((s, i) => `${i + 1}. ${s}`),
        ];
        try {
            await navigator.clipboard.writeText(lines.join("\n"));
            setCopiedFull(true);
            setTimeout(() => setCopiedFull(false), 2000);
        } catch (e) {}
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
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
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
                        <button
                            type="button"
                            onClick={async () => {
                                if (!analysis) {
                                    await handleAnalyze();
                                }
                                setShowQuickModal(true);
                            }}
                            disabled={loading}
                            className="btn-secondary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                            <span>⚡</span>
                            <span>Quick Analysis</span>
                        </button>
                    </div>
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
                    {/* Fixed Top Header */}
                    <div className="card-header analysis-top-header">
                        <div>
                            <h2 className="card-title">Performance & Coaching Report</h2>
                            <p className="card-description">AI-powered evaluation of conversation tactics and outcome</p>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            <button
                                type="button"
                                onClick={() => setShowQuickModal(true)}
                                className="btn-primary btn-sm"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                    border: "none",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                    boxShadow: "0 2px 6px rgba(245, 158, 11, 0.25)"
                                }}
                                title="Open Quick Executive Analysis cards"
                            >
                                <span>⚡</span>
                                <span>Quick Analysis</span>
                            </button>
                            <button
                                type="button"
                                onClick={copyFullReport}
                                className="btn-secondary btn-sm"
                                title="Copy complete report as Markdown"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                {copiedFull ? "Copied" : "Copy"}
                            </button>
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
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                )}
                                {loading ? "Evaluating..." : "Re-evaluate"}
                            </button>
                        </div>
                    </div>

                    {/* Segmented Navigation Tabs */}
                    <div className="analysis-tabs-nav">
                        <button
                            type="button"
                            className={`analysis-tab-btn ${activeTab === "quick" ? "active" : ""}`}
                            onClick={() => setActiveTab("quick")}
                            title="Bite-sized quick summary cards"
                        >
                            <span>⚡ Quick View</span>
                        </button>
                        <button
                            type="button"
                            className={`analysis-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                            onClick={() => setActiveTab("overview")}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            <span>Overview</span>
                        </button>
                        <button
                            type="button"
                            className={`analysis-tab-btn ${activeTab === "coaching" ? "active" : ""}`}
                            onClick={() => setActiveTab("coaching")}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                            <span>Strengths & Growth</span>
                            <span className="tab-count-badge">
                                {(analysis.strengths?.length || 0) + (analysis.weaknesses?.length || 0)}
                            </span>
                        </button>
                        <button
                            type="button"
                            className={`analysis-tab-btn ${activeTab === "actions" ? "active" : ""}`}
                            onClick={() => setActiveTab("actions")}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v1" />
                                <path d="M12 21v1" />
                                <path d="M4.22 4.22l.71.71" />
                                <path d="M18.36 18.36l.71.71" />
                                <path d="M1 12h2" />
                                <path d="M21 12h2" />
                                <circle cx="12" cy="12" r="5" />
                            </svg>
                            <span>Action Plan</span>
                            <span className="tab-count-badge">{analysis.suggestions?.length || 0}</span>
                        </button>
                        <button
                            type="button"
                            className={`analysis-tab-btn ${activeTab === "all" ? "active" : ""}`}
                            onClick={() => setActiveTab("all")}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                            <span>All</span>
                        </button>
                    </div>

                    {/* Scrollable Tab Content Area */}
                    <div className="analysis-scroll-body">
                        {/* TAB 0: QUICK VIEW CARDS */}
                        {activeTab === "quick" && (
                            <div className="tab-pane-section">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        ⚡ Executive At-A-Glance Cards
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        onClick={() => setShowQuickModal(true)}
                                        style={{ fontSize: "12px", padding: "4px 10px" }}
                                    >
                                        ⤢ Expand to Modal
                                    </button>
                                </div>
                                <div className="quick-cards-grid">
                                    {/* Card 1: Score & Verdict */}
                                    <div className="quick-card quick-card-score">
                                        <div className="quick-card-head">
                                            <span className="quick-card-label">Quality Score</span>
                                            <span className={`quick-pill ${analysis.sales_score >= 75 ? "score-high" : analysis.sales_score >= 50 ? "score-mid" : "score-low"}`}>
                                                {analysis.sales_score >= 75 ? "Strong Call" : analysis.sales_score >= 50 ? "Satisfactory" : "Needs Coaching"}
                                            </span>
                                        </div>
                                        <div className="quick-score-display">
                                            <span className="quick-score-number">{analysis.sales_score}</span>
                                            <span className="quick-score-denom">/100</span>
                                        </div>
                                        <p className="quick-card-sub">
                                            {analysis.sales_score >= 75 ? "High deal momentum and strong execution." : analysis.sales_score >= 50 ? "Solid conversation with coaching opportunities." : "Needs targeted pitch review."}
                                        </p>
                                    </div>

                                    {/* Card 2: Customer Sentiment */}
                                    <div className="quick-card quick-card-sentiment">
                                        <div className="quick-card-head">
                                            <span className="quick-card-label">Prospect Sentiment</span>
                                            <SentimentPill sentiment={analysis.sentiment} />
                                        </div>
                                        <div className="quick-sentiment-big">
                                            {analysis.sentiment?.toLowerCase().includes("positive") ? "😊 Positive" : analysis.sentiment?.toLowerCase().includes("negative") ? "😟 Negative" : "😐 Neutral"}
                                        </div>
                                        <p className="quick-card-sub">Customer engagement and emotional receptivity.</p>
                                    </div>

                                    {/* Card 3: Talk Ratio */}
                                    <div className="quick-card quick-card-talk">
                                        <div className="quick-card-head">
                                            <span className="quick-card-label">Talk-Time Ratio</span>
                                            <span className="quick-pill quick-pill-neutral">{talkStats.status}</span>
                                        </div>
                                        <div className="quick-talk-bar-container">
                                            <div className="quick-talk-bar-agent" style={{ width: `${talkStats.agentPct}%` }} title={`Agent: ${talkStats.agentPct}%`} />
                                            <div className="quick-talk-bar-prospect" style={{ width: `${talkStats.prospectPct}%` }} title={`Prospect: ${talkStats.prospectPct}%`} />
                                        </div>
                                        <div className="quick-talk-legend">
                                            <span>Agent: <strong>{talkStats.agentPct}%</strong></span>
                                            <span>Prospect: <strong>{talkStats.prospectPct}%</strong></span>
                                        </div>
                                    </div>

                                    {/* Card 4: Short 1-Line Takeaways (Replaces Long Paragraph) */}
                                    {analysis.summary && (
                                        <div className="quick-card quick-card-full quick-card-summary">
                                            <div className="quick-card-head">
                                                <div className="quick-card-title-group">
                                                    <span className="quick-icon-wrap icon-purple">🎯</span>
                                                    <span className="quick-card-label">Core Call Takeaways</span>
                                                </div>
                                                <span className="quick-pill quick-pill-neutral">Quick Summary</span>
                                            </div>
                                            <div className="quick-takeaway-list">
                                                {parseQuickSummary(analysis.summary).map((item, idx) => (
                                                    <div key={idx} className="quick-takeaway-row">
                                                        <span className="quick-takeaway-tag">
                                                            <span>{item.icon}</span>
                                                            <span>{item.label}:</span>
                                                        </span>
                                                        <span className="quick-takeaway-text">{item.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card 5: Strengths (Short Bullets) */}
                                    <div className="quick-card quick-card-strengths">
                                        <div className="quick-card-head">
                                            <div className="quick-card-title-group">
                                                <span className="quick-icon-wrap icon-green">✓</span>
                                                <span className="quick-card-label">Top Strengths</span>
                                            </div>
                                            <span className="quick-count-tag">{Math.min(2, (analysis.strengths || []).length)} key</span>
                                        </div>
                                        <ul className="quick-bullet-list">
                                            {(analysis.strengths || []).slice(0, 2).map((s, idx) => (
                                                <li key={idx} className="quick-bullet-item bullet-green">
                                                    <span>{toShortBullet(s, 12)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Card 6: Flaws (Short Bullets) */}
                                    <div className="quick-card quick-card-flaws">
                                        <div className="quick-card-head">
                                            <div className="quick-card-title-group">
                                                <span className="quick-icon-wrap icon-amber">⚠</span>
                                                <span className="quick-card-label">To Improve</span>
                                            </div>
                                            <span className="quick-count-tag">{Math.min(2, (analysis.weaknesses || []).length)} key</span>
                                        </div>
                                        <ul className="quick-bullet-list">
                                            {(analysis.weaknesses || []).slice(0, 2).map((w, idx) => (
                                                <li key={idx} className="quick-bullet-item bullet-amber">
                                                    <span>{toShortBullet(w, 12)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Card 7: Action Item (Short Line) */}
                                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                                        <div className="quick-card quick-card-full quick-card-action">
                                            <div className="quick-card-head">
                                                <div className="quick-card-title-group">
                                                    <span className="quick-icon-wrap icon-blue">🚀</span>
                                                    <span className="quick-card-label">Next Immediate Action</span>
                                                </div>
                                                <span className="quick-pill quick-pill-primary">Priority #1</span>
                                            </div>
                                            <p className="quick-action-text">{toShortBullet(analysis.suggestions[0], 15)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 1: OVERVIEW */}
                        {(activeTab === "overview" || activeTab === "all") && (
                            <div className="tab-pane-section">
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
                                        <div className="insight-header section-header-split">
                                            <div className="header-left">
                                                <div className="insight-icon icon-summary">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                        <line x1="16" y1="13" x2="8" y2="13" />
                                                        <line x1="16" y1="17" x2="8" y2="17" />
                                                    </svg>
                                                </div>
                                                <h3 className="insight-title">Executive Summary</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={copySummary}
                                                className="btn-link-action"
                                                title="Copy summary"
                                            >
                                                {copiedSummary ? "Copied ✓" : "Copy"}
                                            </button>
                                        </div>
                                        <p className="summary-text">{analysis.summary}</p>
                                    </div>
                                )}

                                {/* Sub-Score Competencies Breakdown */}
                                {subScores && (
                                    <div className="insight-section competencies-section">
                                        <div className="insight-header">
                                            <div className="insight-icon icon-competencies">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="20" x2="18" y2="10" />
                                                    <line x1="12" y1="20" x2="12" y2="4" />
                                                    <line x1="6" y1="20" x2="6" y2="14" />
                                                </svg>
                                            </div>
                                            <h3 className="insight-title">Competency Breakdown</h3>
                                        </div>
                                        <div className="sub-scores-list">
                                            {subScores.map((item, idx) => (
                                                <SubScoreBar key={idx} label={item.label} score={item.score} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: COACHING & FEEDBACK (Strengths + Weaknesses) */}
                        {(activeTab === "coaching" || activeTab === "all") && (
                            <div className="tab-pane-section">
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
                            </div>
                        )}

                        {/* TAB 3: ACTION RECOMMENDATIONS */}
                        {(activeTab === "actions" || activeTab === "all") && (
                            <div className="tab-pane-section">
                                {analysis.suggestions && analysis.suggestions.length > 0 && (
                                    <div className="insight-section suggestions-section">
                                        <div className="insight-header section-header-split">
                                            <div className="header-left">
                                                <div className="insight-icon icon-suggestion">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 2v1" />
                                                        <path d="M12 21v1" />
                                                        <path d="M4.22 4.22l.71.71" />
                                                        <path d="M18.36 18.36l.71.71" />
                                                        <path d="M1 12h2" />
                                                        <path d="M21 12h2" />
                                                        <circle cx="12" cy="12" r="5" />
                                                    </svg>
                                                </div>
                                                <h3 className="insight-title">Actionable Coaching Recommendations</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={copyCoaching}
                                                className="btn-link-action"
                                                title="Copy coaching tips"
                                            >
                                                {copiedCoaching ? "Copied ✓" : "Copy"}
                                            </button>
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
                </div>
            )}

            {/* Quick Executive Analysis Modal */}
            <QuickAnalysisModal
                isOpen={showQuickModal}
                onClose={() => setShowQuickModal(false)}
                analysis={analysis}
                conversation={conversation}
                onRunAnalysis={handleAnalyze}
                loading={loading}
            />
        </div>
    );
}

export default AnalysisCard;
