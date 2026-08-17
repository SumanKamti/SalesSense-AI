import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

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

    const handleLogout = () => {
        localStorage.removeItem("salessense_token");
        localStorage.removeItem("salessense_user");
        navigate("/login");
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

    return (
        <header className="navbar">
            <div className="navbar-content">
                <div className="navbar-left">
                    <div className="navbar-brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
                        <div className="brand-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                            </div>
                            <p className="brand-subtitle">Sales Conversation Intelligence</p>
                        </div>
                    </div>

                    <nav className="navbar-nav">
                        <button
                            type="button"
                            className={`nav-link ${isActive("/dashboard") ? "nav-active" : ""}`}
                            onClick={() => navigate("/dashboard")}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Dashboard
                        </button>
                        <button
                            type="button"
                            className={`nav-link ${isActive("/history") ? "nav-active" : ""}`}
                            onClick={() => navigate("/history")}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            History
                        </button>
                    </nav>
                </div>

                <div className="navbar-right">
                    {user && (
                        <div className="user-menu">
                            <div className="user-avatar">
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <span className="user-name">{user.full_name}</span>
                            <button type="button" className="btn-logout" onClick={handleLogout} title="Sign out">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;