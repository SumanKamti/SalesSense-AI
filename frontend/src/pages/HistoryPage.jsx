import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { historyAPI } from "../services/api";
import Navbar from "../components/Navbar";

function formatDuration(seconds) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function HistoryPage() {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [scoreFilter, setScoreFilter] = useState("all"); // 'all' | 'high' | 'mid' | 'low'
    const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'score_desc' | 'score_asc'
    const navigate = useNavigate();

    useEffect(() => {
        loadCalls();
    }, []);

    const loadCalls = async () => {
        try {
            setLoading(true);
            const res = await historyAPI.list();
            setCalls(res.data);
        } catch (err) {
            setError("Failed to load call history.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this call record from your history?")) return;
        try {
            await historyAPI.delete(id);
            setCalls(calls.filter((c) => c.id !== id));
        } catch (err) {
            setError("Failed to delete call.");
        }
    };

    // Calculate aggregate metrics for top summary cards
    const summaryStats = useMemo(() => {
        if (!calls || calls.length === 0) {
            return { total: 0, avgScore: 0, strongCount: 0, totalMinutes: 0 };
        }
        const validScores = calls.filter((c) => c.sales_score !== null && c.sales_score !== undefined);
        const avgScore = validScores.length > 0
            ? Math.round(validScores.reduce((acc, c) => acc + c.sales_score, 0) / validScores.length)
            : 0;
        const strongCount = calls.filter((c) => c.sales_score >= 75).length;
        const totalSecs = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
        const totalMinutes = Math.round(totalSecs / 60);

        return { total: calls.length, avgScore, strongCount, totalMinutes };
    }, [calls]);

    // Filter & Sort
    const filteredCalls = useMemo(() => {
        let result = [...calls];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (c) =>
                    (c.title && c.title.toLowerCase().includes(q)) ||
                    (c.audio_filename && c.audio_filename.toLowerCase().includes(q))
            );
        }

        if (scoreFilter === "high") {
            result = result.filter((c) => c.sales_score >= 75);
        } else if (scoreFilter === "mid") {
            result = result.filter((c) => c.sales_score >= 50 && c.sales_score < 75);
        } else if (scoreFilter === "low") {
            result = result.filter((c) => c.sales_score !== null && c.sales_score < 50);
        }

        if (sortBy === "newest") {
            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortBy === "oldest") {
            result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (sortBy === "score_desc") {
            result.sort((a, b) => (b.sales_score || 0) - (a.sales_score || 0));
        } else if (sortBy === "score_asc") {
            result.sort((a, b) => (a.sales_score || 0) - (b.sales_score || 0));
        }

        return result;
    }, [calls, searchQuery, scoreFilter, sortBy]);

    const getScoreClass = (score) => {
        if (score === null || score === undefined) return "";
        if (score >= 75) return "score-badge-high";
        if (score >= 50) return "score-badge-mid";
        return "score-badge-low";
    };

    const getSentimentClass = (sentiment) => {
        if (!sentiment) return "";
        const s = sentiment.toLowerCase();
        if (s.includes("positive")) return "sentiment-positive";
        if (s.includes("negative")) return "sentiment-negative";
        return "sentiment-neutral";
    };

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <div className="container">
                    <div className="history-header">
                        <div>
                            <h1 className="page-title">Call History & Repository</h1>
                            <p className="page-subtitle">Review, analyze, and track performance across your sales calls</p>
                        </div>
                        <button
                            type="button"
                            className="btn-primary btn-nav"
                            onClick={() => navigate("/dashboard")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Analyze New Call
                        </button>
                    </div>

                    {/* Top KPI Metrics Row */}
                    {!loading && calls.length > 0 && (
                        <div className="history-stats-grid">
                            <div className="history-stat-card">
                                <span className="stat-label">Total Calls</span>
                                <span className="stat-value">{summaryStats.total}</span>
                                <span className="stat-sub">{summaryStats.totalMinutes} mins total conversation</span>
                            </div>
                            <div className="history-stat-card">
                                <span className="stat-label">Avg Quality Score</span>
                                <span className="stat-value">{summaryStats.avgScore}<span className="stat-denom">/100</span></span>
                                <span className="stat-sub">{summaryStats.avgScore >= 70 ? "Healthy pitch performance" : "Room for coaching"}</span>
                            </div>
                            <div className="history-stat-card">
                                <span className="stat-label">Strong Calls (75+)</span>
                                <span className="stat-value">{summaryStats.strongCount}</span>
                                <span className="stat-sub">{Math.round((summaryStats.strongCount / summaryStats.total) * 100)}% of total calls</span>
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Toolbar */}
                    {!loading && calls.length > 0 && (
                        <div className="history-toolbar">
                            <div className="history-search-box">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by call title or filename..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="history-search-input"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="search-clear-btn"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <div className="toolbar-controls-right">
                                <div className="filter-pill-group">
                                    <button
                                        type="button"
                                        className={`filter-pill ${scoreFilter === "all" ? "filter-pill-active" : ""}`}
                                        onClick={() => setScoreFilter("all")}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-pill ${scoreFilter === "high" ? "filter-pill-active" : ""}`}
                                        onClick={() => setScoreFilter("high")}
                                    >
                                        Strong (75+)
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-pill ${scoreFilter === "mid" ? "filter-pill-active" : ""}`}
                                        onClick={() => setScoreFilter("mid")}
                                    >
                                        Satisfactory (50-74)
                                    </button>
                                    <button
                                        type="button"
                                        className={`filter-pill ${scoreFilter === "low" ? "filter-pill-active" : ""}`}
                                        onClick={() => setScoreFilter("low")}
                                    >
                                        Needs Coaching
                                    </button>
                                </div>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="history-sort-select"
                                    aria-label="Sort calls"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="score_desc">Highest Score</option>
                                    <option value="score_asc">Lowest Score</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="history-loading">
                            <span className="btn-spinner"></span>
                            <span>Loading call repository...</span>
                        </div>
                    ) : error ? (
                        <div className="alert-box alert-error">
                            <div className="alert-content">{error}</div>
                        </div>
                    ) : calls.length === 0 ? (
                        <div className="card history-empty">
                            <div className="empty-state">
                                <div className="empty-icon-wrapper">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </div>
                                <p className="empty-title">No calls analyzed yet</p>
                                <p className="empty-subtitle">
                                    Upload your first sales call audio recording to generate transcripts, diarization, and coaching scores.
                                </p>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => navigate("/dashboard")}
                                    style={{ marginTop: "16px", width: "auto", padding: "10px 24px" }}
                                >
                                    Analyze First Call
                                </button>
                            </div>
                        </div>
                    ) : filteredCalls.length === 0 ? (
                        <div className="card history-empty">
                            <div className="empty-state">
                                <p className="empty-title">No matching calls found</p>
                                <p className="empty-subtitle">Try adjusting your search keywords or score filter.</p>
                                <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setScoreFilter("all");
                                    }}
                                    style={{ marginTop: "12px" }}
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="history-table-wrapper">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Call Discussion</th>
                                        <th>Date Recorded</th>
                                        <th>Duration</th>
                                        <th>Quality Score</th>
                                        <th>Prospect Sentiment</th>
                                        <th style={{ width: "48px" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCalls.map((call) => (
                                        <tr
                                            key={call.id}
                                            onClick={() => navigate(`/history/${call.id}`)}
                                            className="history-row"
                                        >
                                            <td>
                                                <div className="call-title-cell">
                                                    <div className="call-file-icon">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M9 18V5l12-2v13" />
                                                            <circle cx="6" cy="18" r="3" />
                                                            <circle cx="18" cy="16" r="3" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <span className="call-title">{call.title}</span>
                                                        <span className="call-filename">{call.audio_filename}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="cell-date">{formatDate(call.created_at)}</td>
                                            <td className="cell-duration">{formatDuration(call.duration_seconds)}</td>
                                            <td>
                                                {call.sales_score !== null && call.sales_score !== undefined ? (
                                                    <span className={`score-badge ${getScoreClass(call.sales_score)}`}>
                                                        {call.sales_score}/100
                                                    </span>
                                                ) : (
                                                    <span className="badge-pending">Pending</span>
                                                )}
                                            </td>
                                            <td>
                                                {call.sentiment ? (
                                                    <span className={`sentiment-pill-sm ${getSentimentClass(call.sentiment)}`}>
                                                        {call.sentiment}
                                                    </span>
                                                ) : (
                                                    <span className="badge-pending">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-icon-danger"
                                                    onClick={(e) => handleDelete(call.id, e)}
                                                    title="Delete call"
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18" />
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default HistoryPage;
