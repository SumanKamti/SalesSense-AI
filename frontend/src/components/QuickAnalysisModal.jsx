import { useMemo, useState } from "react";

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

function QuickAnalysisModal({
    isOpen,
    onClose,
    analysis,
    conversation = [],
    onRunAnalysis = null,
    loading = false,
}) {
    const [copied, setCopied] = useState(false);

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

        let status = "Healthy Balance (40-60%)";
        if (agentPct > 65) {
            status = "Agent Dominating (>65%)";
        } else if (agentPct < 35) {
            status = "Prospect Leading (>65%)";
        }

        return { agentPct, prospectPct, status };
    }, [conversation]);

    if (!isOpen) return null;

    const score = analysis?.sales_score ?? null;
    let scoreBadge = { label: "Needs Coaching", color: "var(--danger)", bg: "rgba(239, 68, 68, 0.12)" };
    let verdictText = "High drop-off risk; pitch review needed.";

    if (score !== null) {
        if (score >= 75) {
            scoreBadge = { label: "Strong Call", color: "var(--success)", bg: "rgba(34, 197, 94, 0.12)" };
            verdictText = "High deal momentum & solid execution.";
        } else if (score >= 50) {
            scoreBadge = { label: "Satisfactory", color: "var(--warning)", bg: "rgba(245, 158, 11, 0.12)" };
            verdictText = "Adequate dialogue; minor pitch gaps.";
        }
    }

    const sentiment = (analysis?.sentiment || "Neutral").toLowerCase();
    let sentimentColor = "#64748b";
    let sentimentBg = "rgba(100, 116, 139, 0.12)";
    let sentimentLabel = "Neutral Tone";

    if (sentiment.includes("positive")) {
        sentimentColor = "#16a34a";
        sentimentBg = "rgba(22, 163, 74, 0.12)";
        sentimentLabel = "Positive / Receptive";
    } else if (sentiment.includes("negative")) {
        sentimentColor = "#dc2626";
        sentimentBg = "rgba(220, 38, 38, 0.12)";
        sentimentLabel = "Hesitant / Critical";
    }

    // Top 2 Strengths, Top 2 Weaknesses, #1 Action (all trimmed to ultra-short punchy phrases)
    const topStrengths = (analysis?.strengths || []).slice(0, 2).map((s) => toShortBullet(s, 12));
    const topWeaknesses = (analysis?.weaknesses || []).slice(0, 2).map((w) => toShortBullet(w, 12));
    const primaryAction = toShortBullet(
        analysis?.suggestions?.[0] || "Schedule structured follow-up addressing customer objections.",
        15
    );

    const quickSummaryItems = parseQuickSummary(analysis?.summary);

    const handleCopy = async () => {
        if (!analysis) return;
        const text = [
            `⚡ SalesSense AI — Quick Snapshot`,
            `Score: ${score ?? "N/A"}/100 (${scoreBadge.label})`,
            `Sentiment: ${analysis.sentiment || "Neutral"}`,
            `Talk Ratio: ${talkStats.agentPct}% Agent / ${talkStats.prospectPct}% Prospect`,
            `\nQuick Takeaways:`,
            ...quickSummaryItems.map((item) => `${item.label}: ${item.text}`),
            `\nTop Strengths:`,
            ...topStrengths.map((s) => `• ${s}`),
            `\nAreas to Fix:`,
            ...topWeaknesses.map((w) => `• ${w}`),
            `\nNext Action:`,
            `→ ${primaryAction}`,
        ].join("\n");

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {}
    };

    return (
        <div className="quick-modal-backdrop" onClick={onClose}>
            <div
                className="quick-modal-container"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quick-modal-title"
            >
                {/* Modal Header */}
                <div className="quick-modal-header">
                    <div className="quick-header-left">
                        <div className="quick-modal-badge">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="quick-modal-title" className="quick-modal-title">
                                Quick Executive Analysis
                            </h2>
                            <p className="quick-modal-subtitle">
                                Ultra-fast highlights — no long paragraphs to read
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="quick-modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="quick-modal-body">
                    {!analysis ? (
                        <div className="quick-empty-state">
                            <div className="quick-empty-icon">⚡</div>
                            <h3>No Analysis Available Yet</h3>
                            <p>Generate an AI evaluation to view quick summary cards for this conversation.</p>
                            {onRunAnalysis && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={onRunAnalysis}
                                    disabled={loading}
                                    style={{ marginTop: "16px" }}
                                >
                                    {loading ? "Evaluating..." : "⚡ Generate AI Evaluation"}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="quick-cards-grid">
                            {/* Card 1: Score & Verdict */}
                            <div className="quick-card quick-card-score">
                                <div className="quick-card-head">
                                    <span className="quick-card-label">Quality Score</span>
                                    <span
                                        className="quick-pill"
                                        style={{ color: scoreBadge.color, background: scoreBadge.bg }}
                                    >
                                        {scoreBadge.label}
                                    </span>
                                </div>
                                <div className="quick-score-display">
                                    <span className="quick-score-number">{score ?? "—"}</span>
                                    <span className="quick-score-denom">/100</span>
                                </div>
                                <p className="quick-card-sub">{verdictText}</p>
                            </div>

                            {/* Card 2: Customer Sentiment */}
                            <div className="quick-card quick-card-sentiment">
                                <div className="quick-card-head">
                                    <span className="quick-card-label">Prospect Sentiment</span>
                                    <span
                                        className="quick-pill"
                                        style={{ color: sentimentColor, background: sentimentBg }}
                                    >
                                        {sentimentLabel}
                                    </span>
                                </div>
                                <div className="quick-sentiment-big">
                                    {sentiment.includes("positive") ? "😊" : sentiment.includes("negative") ? "😟" : "😐"}
                                    <span style={{ textTransform: "capitalize", marginLeft: "10px" }}>
                                        {analysis.sentiment || "Neutral"}
                                    </span>
                                </div>
                                <p className="quick-card-sub">
                                    Customer emotional tone & receptiveness
                                </p>
                            </div>

                            {/* Card 3: Talk Ratio */}
                            <div className="quick-card quick-card-talk">
                                <div className="quick-card-head">
                                    <span className="quick-card-label">Talk-Time Ratio</span>
                                    <span className="quick-pill quick-pill-neutral">
                                        {talkStats.status}
                                    </span>
                                </div>
                                <div className="quick-talk-bar-container">
                                    <div
                                        className="quick-talk-bar-agent"
                                        style={{ width: `${talkStats.agentPct}%` }}
                                        title={`Agent: ${talkStats.agentPct}%`}
                                    />
                                    <div
                                        className="quick-talk-bar-prospect"
                                        style={{ width: `${talkStats.prospectPct}%` }}
                                        title={`Prospect: ${talkStats.prospectPct}%`}
                                    />
                                </div>
                                <div className="quick-talk-legend">
                                    <span>Agent: <strong>{talkStats.agentPct}%</strong></span>
                                    <span>Prospect: <strong>{talkStats.prospectPct}%</strong></span>
                                </div>
                            </div>

                            {/* Card 4: Quick 1-Line Takeaways (Replaces Long Paragraph!) */}
                            {quickSummaryItems.length > 0 && (
                                <div className="quick-card quick-card-full quick-card-summary">
                                    <div className="quick-card-head">
                                        <div className="quick-card-title-group">
                                            <span className="quick-icon-wrap icon-purple">🎯</span>
                                            <span className="quick-card-label">Core Call Takeaways</span>
                                        </div>
                                        <span className="quick-pill quick-pill-neutral">Quick Summary</span>
                                    </div>
                                    <div className="quick-takeaway-list">
                                        {quickSummaryItems.map((item, idx) => (
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

                            {/* Card 5: Top Strengths (Short Bullets) */}
                            <div className="quick-card quick-card-strengths">
                                <div className="quick-card-head">
                                    <div className="quick-card-title-group">
                                        <span className="quick-icon-wrap icon-green">✓</span>
                                        <span className="quick-card-label">Top Strengths</span>
                                    </div>
                                    <span className="quick-count-tag">{topStrengths.length} key</span>
                                </div>
                                <ul className="quick-bullet-list">
                                    {topStrengths.length > 0 ? (
                                        topStrengths.map((s, idx) => (
                                            <li key={idx} className="quick-bullet-item bullet-green">
                                                <span>{s}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="quick-bullet-empty">No strengths recorded</li>
                                    )}
                                </ul>
                            </div>

                            {/* Card 6: Top Areas to Improve (Short Bullets) */}
                            <div className="quick-card quick-card-flaws">
                                <div className="quick-card-head">
                                    <div className="quick-card-title-group">
                                        <span className="quick-icon-wrap icon-amber">⚠</span>
                                        <span className="quick-card-label">To Improve</span>
                                    </div>
                                    <span className="quick-count-tag">{topWeaknesses.length} key</span>
                                </div>
                                <ul className="quick-bullet-list">
                                    {topWeaknesses.length > 0 ? (
                                        topWeaknesses.map((w, idx) => (
                                            <li key={idx} className="quick-bullet-item bullet-amber">
                                                <span>{w}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="quick-bullet-empty">No critical flaws detected</li>
                                    )}
                                </ul>
                            </div>

                            {/* Card 7: Next Immediate Action Item (Short Line) */}
                            <div className="quick-card quick-card-full quick-card-action">
                                <div className="quick-card-head">
                                    <div className="quick-card-title-group">
                                        <span className="quick-icon-wrap icon-blue">🚀</span>
                                        <span className="quick-card-label">Next Immediate Action</span>
                                    </div>
                                    <span className="quick-pill quick-pill-primary">Priority #1</span>
                                </div>
                                <p className="quick-action-text">{primaryAction}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="quick-modal-footer">
                    {analysis && (
                        <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={handleCopy}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {copied ? "Copied ✓" : "Copy Snapshot"}
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default QuickAnalysisModal;
