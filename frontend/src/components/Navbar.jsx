import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { authAPI } from "../services/api";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("salessense_theme") || "light";
    });
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("salessense_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    useEffect(() => {
        const stored = localStorage.getItem("salessense_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                setUser(null);
            }
        }
    }, []);

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } catch (e) {
            // Ignore if backend logout fails (e.g. offline/already expired)
        } finally {
            localStorage.removeItem("salessense_token");
            localStorage.removeItem("salessense_user");
            navigate("/login");
        }
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");
    const isTeamManager = user && user.organization_id && (user.role === "admin" || user.role === "manager");

    return (
        <header className="navbar">
            <div className="navbar-content">
                <div className="navbar-left">
                    <button type="button" className="navbar-brand" onClick={() => { navigate("/dashboard"); setMenuOpen(false); }}
                            aria-current={isActive("/dashboard") ? "page" : undefined} style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                        <div className="brand-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M2 10v4" />
                                <path d="M6 6v12" />
                                <path d="M10 3v18" />
                                <path d="M14 7v10" />
                                <path d="M18 5v14" />
                                <path d="M22 10v4" />
                            </svg>
                        </div>
                        <div className="brand-text">
                            <div className="brand-title">
                                SalesSense <span className="brand-badge">AI</span>
                                {user?.organization_name && (
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            color: "var(--primary)",
                                            background: "var(--primary-subtle)",
                                            border: "1px solid var(--primary-border)",
                                            padding: "1px 7px",
                                            borderRadius: "12px",
                                            marginLeft: "8px",
                                            letterSpacing: "0.2px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                        }}
                                    >
                                        🏢 {user.organization_name}
                                    </span>
                                )}
                            </div>
                            <p className="brand-subtitle">Sales Conversation Intelligence</p>
                        </div>
                    </button>

                    <button
                            type="button"
                            className="hamburger-btn"
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Toggle navigation menu"
                            aria-expanded={menuOpen}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                {menuOpen ? (
                                    <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                                ) : (
                                    <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                                )}
                            </svg>
                        </button>
                        <nav className={`navbar-nav ${menuOpen ? "nav-open" : ""}`}>
                        <button
                            type="button"
                            className={`nav-link ${isActive("/dashboard") ? "nav-active" : ""}`}
                            onClick={() => { navigate("/dashboard"); setMenuOpen(false); }}
                            aria-current={isActive("/dashboard") ? "page" : undefined}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Dashboard
                        </button>
                        <button
                            type="button"
                            className={`nav-link ${isActive("/history") ? "nav-active" : ""}`}
                            onClick={() => { navigate("/history"); setMenuOpen(false); }}
                            aria-current={isActive("/history") ? "page" : undefined}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            History
                        </button>
                        {isTeamManager && (
                            <>
                                <button
                                    type="button"
                                    className={`nav-link ${isActive("/analytics") ? "nav-active" : ""}`}
                                    onClick={() => { navigate("/analytics"); setMenuOpen(false); }}
                            aria-current={isActive("/analytics") ? "page" : undefined}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <line x1="18" y1="20" x2="18" y2="10" />
                                        <line x1="12" y1="20" x2="12" y2="4" />
                                        <line x1="6" y1="20" x2="6" y2="14" />
                                    </svg>
                                    Analytics
                                </button>
                                <button
                                    type="button"
                                    className={`nav-link ${isActive("/team") ? "nav-active" : ""}`}
                                    onClick={() => { navigate("/team"); setMenuOpen(false); }}
                            aria-current={isActive("/team") ? "page" : undefined}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    Team
                                </button>
                            </>
                        )}
                    </nav>
                </div>

                <div className="navbar-right">
                    {user && (
                        <>
                        <button
                            type="button"
                            className="theme-toggle-btn"
                            onClick={toggleTheme}
                            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                            title={theme === "dark" ? "Light mode" : "Dark mode"}
                        >
                            {theme === "dark" ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            )}
                        </button>
                        <div className="user-menu">
                            <div className="user-avatar">
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginRight: "4px" }}>
                                <span className="user-name">{user.full_name}</span>
                                {user.role && (
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                            color: user.role === "admin" ? "var(--danger-text)" : user.role === "manager" ? "var(--warning-text)" : "var(--primary)",
                                        }}
                                    >
                                        {user.role}
                                    </span>
                                )}
                            </div>
                            <button type="button" className="btn-logout" onClick={handleLogout} aria-label="Sign out" title="Sign out">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;