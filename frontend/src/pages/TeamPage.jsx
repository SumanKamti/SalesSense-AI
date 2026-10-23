import { useState, useEffect } from "react";
import { orgAPI } from "../services/api";
import Navbar from "../components/Navbar";

function TeamPage() {
    const [team, setTeam] = useState([]);
    const [org, setOrg] = useState(null);
    const [stats, setStats] = useState(null);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Invite form state
    const [inviteRole, setInviteRole] = useState("rep");
    const [capacityMode, setCapacityMode] = useState("unlimited"); // "unlimited" | "limited"
    const [maxUses, setMaxUses] = useState(50);
    const [customCode, setCustomCode] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [generatedCode, setGeneratedCode] = useState(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem("salessense_user") || "{}");
    const isAdmin = currentUser.role === "admin";
    const isManager = currentUser.role === "manager";
    const canManageTeam = isAdmin || isManager;

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [orgRes, teamRes, statsRes] = await Promise.all([
                orgAPI.get(),
                orgAPI.getTeam(),
                orgAPI.getStats(),
            ]);

            setOrg(orgRes.data);
            setTeam(teamRes.data);
            setStats(statsRes.data);

            if (canManageTeam) {
                const invRes = await orgAPI.getInvitations();
                setInvitations(invRes.data);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load team workspace.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const payload = {
                role: inviteRole,
                email: inviteEmail.trim() || null,
                max_uses: capacityMode === "limited" ? parseInt(maxUses, 10) : null,
                custom_code: customCode.trim() || null,
            };

            const res = await orgAPI.createInvite(payload);
            setGeneratedCode(res.data.invite_code);
            setSuccessMsg(
                `Created ${capacityMode === "unlimited" ? "reusable (unlimited)" : `multi-use (${maxUses} members)`} team invite!`
            );
            setInviteEmail("");
            setCustomCode("");

            // Reload invitations list
            const invRes = await orgAPI.getInvitations();
            setInvitations(invRes.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to generate invitation.");
        } finally {
            setInviteLoading(false);
        }
    };

    const getFullInviteLink = (code) => {
        return `${window.location.origin}/login?invite=${encodeURIComponent(code)}`;
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyLink = (code) => {
        const link = getFullInviteLink(code);
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleRevokeInvite = async (inviteId) => {
        if (!window.confirm("Revoke this invitation? Anyone with this link will no longer be able to join.")) return;
        try {
            await orgAPI.revokeInvite(inviteId);
            setInvitations(invitations.filter((i) => i.id !== inviteId));
            setSuccessMsg("Invitation revoked.");
        } catch (err) {
            setError("Failed to revoke invitation.");
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await orgAPI.updateRole(userId, newRole);
            setTeam(team.map((m) => (m.id === userId ? { ...m, role: newRole } : m)));
            setSuccessMsg("Role updated successfully.");
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to change role.");
        }
    };

    const handleRemoveMember = async (userId, name) => {
        if (!window.confirm(`Are you sure you want to remove ${name} from the team?`)) return;
        try {
            await orgAPI.removeMember(userId);
            setTeam(team.filter((m) => m.id !== userId));
            setSuccessMsg(`${name} has been removed from the organization.`);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to remove member.");
        }
    };

    const getScoreBadgeClass = (score) => {
        if (score === null || score === undefined) return "badge-pending";
        if (score >= 75) return "score-badge score-badge-high";
        if (score >= 50) return "score-badge score-badge-mid";
        return "score-badge score-badge-low";
    };

    const getRolePillClass = (role) => {
        if (role === "admin") return "role-badge-admin";
        if (role === "manager") return "role-badge-manager";
        return "role-badge-rep";
    };

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <div className="container">
                    {/* Header */}
                    <div className="history-header" style={{ marginBottom: "24px" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <h1 className="page-title">{org ? org.name : "Sales Team Workspace"}</h1>
                                {org && (
                                    <span className="brand-badge" style={{ fontSize: "11px", padding: "3px 8px" }}>
                                        {org.member_count} Member{org.member_count === 1 ? "" : "s"}
                                    </span>
                                )}
                            </div>
                            <p className="page-subtitle">
                                Manage sales representatives, generate onboarding team links, and track team performance
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="alert-box alert-error" style={{ marginBottom: "20px" }}>
                            <div className="alert-content">{error}</div>
                        </div>
                    )}

                    {successMsg && (
                        <div className="alert-box alert-success" style={{ marginBottom: "20px" }}>
                            <div className="alert-content">{successMsg}</div>
                        </div>
                    )}

                    {/* KPI Stats */}
                    {stats && (
                        <div className="history-stats-grid" style={{ marginBottom: "24px" }}>
                            <div className="history-stat-card">
                                <span className="stat-label">Team Total Calls</span>
                                <span className="stat-value">{stats.total_calls}</span>
                                <span className="stat-sub">Across all sales representatives</span>
                            </div>
                            <div className="history-stat-card">
                                <span className="stat-label">Team Avg Quality</span>
                                <span className="stat-value">
                                    {stats.avg_score}
                                    <span className="stat-denom">/100</span>
                                </span>
                                <span className="stat-sub">Calibrated by Gemini AI</span>
                            </div>
                            <div className="history-stat-card">
                                <span className="stat-label">Sales Reps & Managers</span>
                                <span className="stat-value">{stats.total_members}</span>
                                <span className="stat-sub">In your organization</span>
                            </div>
                        </div>
                    )}

                    {/* Multi-Use Team Invite Card for Admins & Managers */}
                    {canManageTeam && (
                        <div className="card" style={{ marginBottom: "24px", padding: "22px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                                <div>
                                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>
                                        🚀 Shareable Team Onboarding Link
                                    </h3>
                                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "680px" }}>
                                        {isAdmin ? (
                                            <>Generate <strong>one single link</strong> that sales reps or managers can click to register and automatically join your team.</>
                                        ) : (
                                            <>Generate a team link to onboard <strong>Sales Representatives</strong> to your squad. (Manager privileges restrict invites to Reps).</>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateInvite} style={{ marginTop: "16px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "14px" }}>
                                    <div>
                                        <label className="form-label" style={{ fontSize: "12px" }}>Role to Assign</label>
                                        {isAdmin ? (
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value)}
                                                className="form-input"
                                                style={{ height: "40px" }}
                                            >
                                                <option value="rep">Sales Rep (Default)</option>
                                                <option value="manager">Sales Manager</option>
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value="Sales Rep (Default)"
                                                disabled
                                                className="form-input"
                                                style={{ height: "40px", background: "var(--bg-subtle)", cursor: "not-allowed" }}
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <label className="form-label" style={{ fontSize: "12px" }}>Link Capacity</label>
                                        <select
                                            value={capacityMode}
                                            onChange={(e) => setCapacityMode(e.target.value)}
                                            className="form-input"
                                            style={{ height: "40px" }}
                                        >
                                            <option value="unlimited">♾️ Unlimited (Entire Cohort)</option>
                                            <option value="limited">🔢 Specific Limit (e.g. 50 reps)</option>
                                        </select>
                                    </div>

                                    {capacityMode === "limited" && (
                                        <div>
                                            <label className="form-label" style={{ fontSize: "12px" }}>Max Number of Uses</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="1000"
                                                value={maxUses}
                                                onChange={(e) => setMaxUses(e.target.value)}
                                                className="form-input"
                                                style={{ height: "40px" }}
                                                placeholder="50"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="form-label" style={{ fontSize: "12px" }}>Custom Code Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={customCode}
                                            onChange={(e) => setCustomCode(e.target.value)}
                                            placeholder="e.g. ACME-SALES-2026"
                                            className="form-input"
                                            style={{ height: "40px" }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="btn-primary"
                                    style={{ width: "auto", height: "40px", padding: "0 24px" }}
                                >
                                    {inviteLoading ? "Generating Team Link..." : "✨ Create Team Invite Link"}
                                </button>
                            </form>

                            {/* Show newly created banner */}
                            {generatedCode && (
                                <div style={{ marginTop: "18px", padding: "16px", background: "var(--primary-subtle)", borderRadius: "10px", border: "1px solid var(--primary-border)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                                        <div>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                🎯 Shareable Team Registration Link:
                                            </span>
                                            <div style={{ fontSize: "14px", fontFamily: "monospace", color: "var(--text-primary)", fontWeight: "600", marginTop: "4px", wordBreak: "break-all" }}>
                                                {getFullInviteLink(generatedCode)}
                                            </div>
                                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                                                Code: <strong style={{ color: "var(--text-primary)" }}>{generatedCode}</strong> • Share this in your company Slack or email!
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyLink(generatedCode)}
                                                className="btn-primary btn-sm"
                                                style={{ width: "auto", padding: "8px 16px" }}
                                            >
                                                {copiedLink ? "✓ Link Copied!" : "🔗 Copy 1-Click Link"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyCode(generatedCode)}
                                                className="btn-secondary btn-sm"
                                                style={{ width: "auto", padding: "8px 16px" }}
                                            >
                                                {copiedCode ? "✓ Code Copied!" : "📋 Copy Code"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active & Multi-use Invitations List */}
                            {invitations.length > 0 && (
                                <div style={{ marginTop: "24px" }}>
                                    <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                        Active Team Invite Links ({invitations.filter((i) => !i.used).length})
                                    </h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {invitations.map((inv) => (
                                            <div
                                                key={inv.id}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "10px 14px",
                                                    background: "var(--bg-app)",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--border-subtle)",
                                                    flexWrap: "wrap",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                                                    <span style={{ fontFamily: "monospace", fontWeight: "700", fontSize: "13px" }}>
                                                        {inv.invite_code}
                                                    </span>
                                                    <span className={`role-badge ${getRolePillClass(inv.role)}`}>
                                                        {inv.role.toUpperCase()}
                                                    </span>
                                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>
                                                        {inv.max_uses ? `Uses: ${inv.used_count || 0} / ${inv.max_uses}` : `Uses: ${inv.used_count || 0} (Unlimited)`}
                                                    </span>
                                                    {inv.used ? (
                                                        <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>
                                                            Exhausted
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "var(--success-text)", fontSize: "12px", fontWeight: "600" }}>
                                                            ● Active
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                                    {!inv.used && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyLink(inv.invite_code)}
                                                            className="btn-secondary btn-sm"
                                                            style={{ fontSize: "11px", padding: "4px 10px" }}
                                                            title="Copy 1-click registration URL"
                                                        >
                                                            🔗 Copy Link
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRevokeInvite(inv.id)}
                                                        className="btn-icon-danger"
                                                        title="Revoke invite code"
                                                        style={{ padding: "5px" }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18" />
                                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Team Members Table */}
                    <div className="card" style={{ padding: "20px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
                            👥 Team Members ({team.length})
                        </h3>

                        {loading ? (
                            <div className="history-loading">
                                <span className="btn-spinner"></span>
                                <span>Loading team members...</span>
                            </div>
                        ) : team.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No team members found.</p>
                        ) : (
                            <div className="history-table-wrapper">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Member</th>
                                            <th>Role</th>
                                            <th>Calls Analyzed</th>
                                            <th>Avg Quality Score</th>
                                            <th>Joined Date</th>
                                            {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {team.map((member) => (
                                            <tr key={member.id}>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        <div
                                                            style={{
                                                                width: "32px",
                                                                height: "32px",
                                                                borderRadius: "50%",
                                                                background: "var(--primary-subtle)",
                                                                color: "var(--primary)",
                                                                fontWeight: "700",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                fontSize: "13px",
                                                            }}
                                                        >
                                                            {member.full_name ? member.full_name.charAt(0).toUpperCase() : "U"}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: "600", fontSize: "14px" }}>
                                                                {member.full_name}
                                                                {member.id === currentUser.id && (
                                                                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "6px" }}>
                                                                        (You)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{member.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {isAdmin && member.id !== currentUser.id ? (
                                                        <select
                                                            value={member.role}
                                                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                            className="history-sort-select"
                                                            style={{ padding: "4px 8px", fontSize: "12px" }}
                                                        >
                                                            <option value="rep">Sales Rep</option>
                                                            <option value="manager">Sales Manager</option>
                                                            <option value="admin">Administrator</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`role-badge ${getRolePillClass(member.role)}`}>
                                                            {member.role.toUpperCase()}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: "600" }}>{member.call_count} calls</td>
                                                <td>
                                                    {member.avg_score !== null && member.avg_score !== undefined ? (
                                                        <span className={getScoreBadgeClass(member.avg_score)}>
                                                            {member.avg_score}/100
                                                        </span>
                                                    ) : (
                                                        <span className="badge-pending">No calls yet</span>
                                                    )}
                                                </td>
                                                <td className="cell-date">
                                                    {new Date(member.created_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                                {isAdmin && (
                                                    <td style={{ textAlign: "right" }}>
                                                        {member.id !== currentUser.id && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveMember(member.id, member.full_name)}
                                                                className="btn-icon-danger"
                                                                title="Remove member from team"
                                                            >
                                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M3 6h18" />
                                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default TeamPage;
