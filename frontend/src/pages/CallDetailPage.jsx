import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { historyAPI } from "../services/api";
import Navbar from "../components/Navbar";
import TranscriptCard from "../components/TranscriptCard";
import AnalysisCard from "../components/AnalysisCard";

function CallDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [call, setCall] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCall();
    }, [id]);

    const loadCall = async () => {
        try {
            setLoading(true);
            const res = await historyAPI.get(id);
            setCall(res.data);
        } catch (err) {
            setError("Failed to load call details.");
        } finally {
            setLoading(false);
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

    const conversation = call.transcript_json ? JSON.parse(call.transcript_json) : [];
    const savedAnalysis = call.analysis_json ? JSON.parse(call.analysis_json) : null;

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <div className="container">
                    {/* Call Header */}
                    <div className="call-detail-header">
                        <button
                            type="button"
                            className="btn-back"
                            onClick={() => navigate("/history")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5" />
                                <path d="M12 19l-7-7 7-7" />
                            </svg>
                            Back to History
                        </button>
                        <div className="call-detail-info">
                            <h1 className="page-title">{call.title}</h1>
                            <div className="call-detail-meta">
                                <span className="meta-pill">{call.audio_filename}</span>
                                {call.duration_seconds && (
                                    <span className="meta-pill">
                                        {Math.floor(call.duration_seconds / 60)}:{String(Math.floor(call.duration_seconds % 60)).padStart(2, "0")} duration
                                    </span>
                                )}
                                <span className="meta-pill">
                                    {new Date(call.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Transcript + Analysis Grid */}
                    <div className="dashboard-results-grid">
                        <div className="dashboard-column transcript-column">
                            <TranscriptCard conversation={conversation} />
                        </div>
                        <div className="dashboard-column analysis-column">
                            <AnalysisCard
                                conversation={conversation}
                                savedAnalysis={savedAnalysis}
                                conversationId={call.id}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default CallDetailPage;
