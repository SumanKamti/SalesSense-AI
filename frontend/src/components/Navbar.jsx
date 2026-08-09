function Navbar() {
    return (
        <header className="navbar">
            <div className="navbar-content">
                <div className="navbar-brand">
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
                <div className="navbar-status">
                    <span className="status-dot"></span>
                    <span className="status-label">Engine Ready</span>
                </div>
            </div>
        </header>
    );
}

export default Navbar;