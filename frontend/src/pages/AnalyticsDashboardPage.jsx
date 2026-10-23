import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#4f8cff", "#23c770", "#ff6b6b", "#a78bfa", "#f59e42", "#36d6e7"];
const SENTIMENT_COLORS = { Positive: "#23c770", Neutral: "#a78bfa", Negative: "#ff6b6b", Unknown: "#94a3b8" };

function AnalyticsDashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(30);
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem("salessense_user") || "{}");
    const isAuthorized = currentUser.organization_id && (currentUser.role === "admin" || currentUser.role === "manager");

    useEffect(() => {
        if (!isAuthorized) return;
        loadAnalytics();
    }, [days]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const res = await api.get("/analytics/dashboard", { params: { days } });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load analytics.");
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="app-shell">
                <Navbar />
                <main className="main-content">
                    <div className="container">
                        <div className="alert-box alert-error">
                            <div className="alert-content">Access denied. Analytics is available for managers and admins only.</div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <div className="container">
                    {/* Header */}
                    <div className="analytics-header">
                        <div>
                            <h1 className="page-title">Team Analytics Dashboard</h1>
                            <p className="page-subtitle">
                                Performance insights for {currentUser.organization_name || "your organization"}
                            </p>
                        </div>
                        <div className="analytics-controls">
                            <div className="filter-pill-group">
                                {[7, 30, 90, 365].map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`filter-pill ${days === d ? "filter-pill-active" : ""}`}
                                        onClick={() => setDays(d)}
                                    >
                                        {d === 365 ? "1 Year" : `${d}d`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="history-loading">
                            <span className="btn-spinner"></span>
                            <span>Loading analytics...</span>
                        </div>
                    ) : error ? (
                        <div className="alert-box alert-error">
                            <div className="alert-content">{error}</div>
                        </div>
                    ) : data ? (
                        <>
                            {/* Overview KPI Cards */}
                            <div className="analytics-kpi-grid">
                                <div className="analytics-kpi-card">
                                    <span className="analytics-kpi-label">Total Calls</span>
                                    <span className="analytics-kpi-value">{data.overview.total_calls}</span>
                                    <span className="analytics-kpi-sub">{data.overview.total_duration_mins} mins recorded</span>
                                </div>
                                <div className="analytics-kpi-card">
                                    <span className="analytics-kpi-label">Avg Quality Score</span>
                                    <span className="analytics-kpi-value">
                                        {data.overview.avg_score}<span className="analytics-kpi-denom">/100</span>
                                    </span>
                                    <span className="analytics-kpi-sub">
                                        {data.overview.avg_score >= 70 ? "Healthy performance" : "Room for improvement"}
                                    </span>
                                </div>
                                <div className="analytics-kpi-card">
                                    <span className="analytics-kpi-label">Strong Calls (75+)</span>
                                    <span className="analytics-kpi-value">{data.overview.strong_calls}</span>
                                    <span className="analytics-kpi-sub">{data.overview.strong_call_pct}% of all calls</span>
                                </div>
                                <div className="analytics-kpi-card">
                                    <span className="analytics-kpi-label">Team Members</span>
                                    <span className="analytics-kpi-value">{data.rep_comparison?.length || 0}</span>
                                    <span className="analytics-kpi-sub">Active in this period</span>
                                </div>
                            </div>

                            {/* Charts Row 1: Score Trends + Call Volume */}
                            <div className="analytics-charts-row">
                                <div className="analytics-chart-card">
                                    <h3 className="analytics-chart-title">Score Trends Over Time</h3>
                                    {data.score_trends.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <LineChart data={data.score_trends}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis
                                                    dataKey="week"
                                                    tick={{ fontSize: 11 }}
                                                    tickFormatter={(v) => {
                                                        const d = new Date(v);
                                                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                                    }}
                                                />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                                <Tooltip
                                                    formatter={(value) => [`${value}`, "Avg Score"]}
                                                    labelFormatter={(v) => {
                                                        const d = new Date(v);
                                                        return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                                                    }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="avg_score"
                                                    stroke="#4f8cff"
                                                    strokeWidth={2.5}
                                                    dot={{ fill: "#4f8cff", r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                    name="Avg Score"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="analytics-empty">No score data in this period</div>
                                    )}
                                </div>

                                <div className="analytics-chart-card">
                                    <h3 className="analytics-chart-title">Call Volume</h3>
                                    {data.call_volume.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={data.call_volume}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 10 }}
                                                    tickFormatter={(v) => {
                                                        const d = new Date(v);
                                                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                                    }}
                                                    interval={Math.max(Math.floor(data.call_volume.length / 8), 0)}
                                                />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                <Tooltip
                                                    labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                                />
                                                <Bar dataKey="count" fill="#a78bfa" radius={[3, 3, 0, 0]} name="Calls" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="analytics-empty">No call data in this period</div>
                                    )}
                                </div>
                            </div>

                            {/* Charts Row 2: Rep Comparison + Sentiment */}
                            <div className="analytics-charts-row">
                                <div className="analytics-chart-card analytics-chart-wide">
                                    <h3 className="analytics-chart-title">Rep Performance Comparison</h3>
                                    {data.rep_comparison.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={data.rep_comparison} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    tick={{ fontSize: 12 }}
                                                    width={120}
                                                />
                                                <Tooltip
                                                    formatter={(value, name) => [
                                                        name === "avg_score" ? `${value}/100` : value,
                                                        name === "avg_score" ? "Avg Score" : "Total Calls",
                                                    ]}
                                                />
                                                <Bar dataKey="avg_score" fill="#4f8cff" radius={[0, 4, 4, 0]} name="Avg Score" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="analytics-empty">No rep data available</div>
                                    )}
                                </div>

                                <div className="analytics-chart-card">
                                    <h3 className="analytics-chart-title">Sentiment Distribution</h3>
                                    {data.sentiment_distribution.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={data.sentiment_distribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    innerRadius={55}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false}
                                                >
                                                    {data.sentiment_distribution.map((entry, index) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={SENTIMENT_COLORS[entry.name] || COLORS[index % COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="analytics-empty">No sentiment data</div>
                                    )}
                                </div>
                            </div>

                            {/* Top Coaching Areas */}
                            {data.top_coaching_areas.length > 0 && (
                                <div className="analytics-chart-card" style={{ marginBottom: "32px" }}>
                                    <h3 className="analytics-chart-title">Top Coaching Areas</h3>
                                    <p className="analytics-chart-subtitle">Most common improvement areas identified by AI analysis</p>
                                    <div className="coaching-areas-list">
                                        {data.top_coaching_areas.map((area, idx) => (
                                            <div key={idx} className="coaching-area-item">
                                                <span className="coaching-area-rank">#{idx + 1}</span>
                                                <span className="coaching-area-name">{area.area}</span>
                                                <span className="coaching-area-count">{area.count} calls</span>
                                                <div className="coaching-area-bar">
                                                    <div
                                                        className="coaching-area-fill"
                                                        style={{
                                                            width: `${Math.min((area.count / Math.max(data.top_coaching_areas[0]?.count || 1, 1)) * 100, 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rep Details Table */}
                            {data.rep_comparison.length > 0 && (
                                <div className="analytics-chart-card" style={{ marginBottom: "32px" }}>
                                    <h3 className="analytics-chart-title">Rep Performance Details</h3>
                                    <div className="history-table-wrapper">
                                        <table className="history-table">
                                            <thead>
                                                <tr>
                                                    <th>Rep Name</th>
                                                    <th>Role</th>
                                                    <th>Total Calls</th>
                                                    <th>Avg Score</th>
                                                    <th>Strong Calls</th>
                                                    <th>Avg Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.rep_comparison.map((rep) => (
                                                    <tr key={rep.id} className="history-row">
                                                        <td style={{ fontWeight: 600 }}>{rep.name}</td>
                                                        <td>
                                                            <span className={`role-badge role-badge-${rep.role}`}>
                                                                {rep.role}
                                                            </span>
                                                        </td>
                                                        <td>{rep.total_calls}</td>
                                                        <td>
                                                            <span className={`score-badge ${
                                                                rep.avg_score >= 75 ? "score-badge-high" :
                                                                rep.avg_score >= 50 ? "score-badge-mid" : "score-badge-low"
                                                            }`}>
                                                                {rep.avg_score}/100
                                                            </span>
                                                        </td>
                                                        <td>{rep.strong_calls}</td>
                                                        <td>{rep.avg_duration} min</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </main>
        </div>
    );
}

export default AnalyticsDashboardPage;
