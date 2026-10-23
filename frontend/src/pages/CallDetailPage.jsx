import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { historyAPI } from "../services/api";
import Navbar from "../components/Navbar";
import TranscriptCard from "../components/TranscriptCard";
import AnalysisCard from "../components/AnalysisCard";
import QuickAnalysisModal from "../components/QuickAnalysisModal";

function cleanTitle(title) {
    if (!title || title.trim() === "Untitled Call") return "Sales / Support Conversation";
    let t = title
        .replace(/forward slash/gi, "/")
        .replace(/dot com/gi, ".com")
        .replace(/dot org/gi, ".org")
        .replace(/dot net/gi, ".net");
    t = t.replace(/\.{3,}$/, "").trim();
    if (t.length > 75) {
        t = t.slice(0, 75).trim() + "...";
    }
    return t;
}

function CallDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [call, setCall] = useState(null);
    const [conversation, setConversation] = useState([]);
    const [savedAnalysis, setSavedAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showQuickModal, setShowQuickModal] = useState(false);

    useEffect(() => {
        loadCall();
    }, [id]);

    const loadCall = async () => {
        try {
            setLoading(true);
            const res = await historyAPI.get(id);
            setCall(res.data);
            const conv = res.data.transcript_json ? JSON.parse(res.data.transcript_json) : [];
            const anal = res.data.analysis_json ? JSON.parse(res.data.analysis_json) : null;
            setConversation(conv);
            setSavedAnalysis(anal);
        } catch (err) {
            setError("Failed to load call details.");
        } finally {
            setLoading(false);
        }
    };

    const handleSwapRoles = () => {
        setConversation((prev) =>
            prev.map((turn) => {
                const currentRole = turn.role || (turn.speaker === "SPEAKER_00" ? "Sales Agent" : "Prospect");
                const nextRole = currentRole === "Sales Agent" ? "Prospect" : "Sales Agent";
                return {
                    ...turn,
                    role: nextRole,
                };
            })
        );
    };

    const handleExportCSV = async (e) => {
        e.preventDefault();
        try {
            const res = await api.get(`/export/call/${id}/csv`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `call_${id}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed.');
        }
    };

    const handleExportPDF = async (e) => {
        e.preventDefault();
        try {
            const res = await api.get(`/export/call/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `call_${id}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed.');
        }
    };

    if (loading) {
        return (
            <div className="app-shell">
                <Navbar />
                <main className="main-content">
                    <div className="container">
                        <div className="history-loading">
                            <span className="btn-spinner"></span>
                            <span>Loading call details...</span>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !call) {
        return (
            <div className="app-shell">
                <Navbar />
                <main className="main-content">
                    <div className="container">
                        <div className="alert-box alert-error">
                            <div className="alert-content">{error || "Call not found."}</div>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate("/history")}
                            style={{ marginTop: "16px" }}
                        >
                            ← Back to History
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <div className="container call-detail-container">
                    {/* Modern Clean Call Header */}
                    <div className="call-detail-topbar">
                        <div className="call-breadcrumb-nav">
                            <button
                                type="button"
                                className="breadcrumb-back-btn"
                                onClick={() => navigate("/history")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                                <span>Call History</span>
                            </button>
                            <span className="breadcrumb-divider">/</span>
                            <span className="breadcrumb-current">Call #{id}</span>
                        </div>

                        <div className="call-header-main-row">
                            <div className="call-header-info">
                                <h1 className="call-main-title" title={call.title}>
                                    {cleanTitle(call.title)}
                                </h1>
                                <div className="call-meta-chips">
                                    <span className="meta-chip chip-file" title={call.audio_filename}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                        </svg>
                                        <span>{call.audio_filename || "audio_recording"}</span>
                                    </span>
                                    {call.duration_seconds && (
                                        <span className="meta-chip chip-duration">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            <span>
                                                {Math.floor(call.duration_seconds / 60)}:{String(Math.floor(call.duration_seconds % 60)).padStart(2, "0")} duration
                                            </span>
                                        </span>
                                    )}
                                    <span className="meta-chip chip-date">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <span>
                                            {new Date(call.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </span>
                                    {call.sales_score !== null && call.sales_score !== undefined && (
                                        <span className={`meta-chip chip-score ${
                                            call.sales_score >= 75 ? "score-high" :
                                            call.sales_score >= 50 ? "score-mid" : "score-low"
                                        }`}>
                                            Score: {call.sales_score}/100
                                        </span>
                                    )}
                                    {call.sentiment && (
                                        <span className="meta-chip chip-sentiment">
                                            {call.sentiment}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="call-header-actions">
                                <button
                                    type="button"
                                    className="btn-primary btn-sm"
                                    onClick={() => setShowQuickModal(true)}
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
                                    className="btn-secondary btn-sm"
                                    onClick={handleExportCSV}
                                    title="Export call transcript and metrics as CSV"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Export CSV
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={handleExportPDF}
                                    title="Export complete coaching report as PDF"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                    Export PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Synchronized 2-Column Dashboard Grid */}
                    <div className="dashboard-results-grid">
                        <div className="dashboard-column transcript-column">
                            <TranscriptCard
                                conversation={conversation}
                                onSwapRoles={handleSwapRoles}
                            />
                        </div>
                        <div className="dashboard-column analysis-column">
                            <AnalysisCard
                                conversation={conversation}
                                savedAnalysis={savedAnalysis}
                                conversationId={call.id}
                            />
                        </div>
                    </div>

                    {/* Quick Executive Analysis Modal */}
                    <QuickAnalysisModal
                        isOpen={showQuickModal}
                        onClose={() => setShowQuickModal(false)}
                        analysis={savedAnalysis}
                        conversation={conversation}
                    />
                </div>
            </main>
        </div>
    );
}

export default CallDetailPage;
