import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function HomePage() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState("transcript"); // "transcript" | "analysis"

    useEffect(() => {
        const token = localStorage.getItem("salessense_token");
        const storedUser = localStorage.getItem("salessense_user");
        if (token) {
            setIsAuthenticated(true);
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    setUser(null);
                }
            }
        }
    }, []);

    return (
        <div className="home-viewport">
            {/* Top Public Navbar */}
            <header className="home-nav">
                <div className="home-nav-inner">
                    <div className="home-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                        <div className="home-brand-icon">
                            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="28" height="28" rx="8" fill="url(#brand-crest-grad)" />
                                <path d="M7 14.5L10 11.5L14 15.5L21 8.5" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="8" cy="19.5" r="1.5" fill="#E2B16A" />
                                <circle cx="14" cy="19.5" r="1.5" fill="#E2B16A" />
                                <circle cx="20" cy="19.5" r="1.5" fill="#E2B16A" />
                                <defs>
                                    <linearGradient id="brand-crest-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#1E293B" />
                                        <stop offset="1" stopColor="#0B1120" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="home-brand-text">
                            <span className="home-brand-title">SalesSense <span className="home-brand-badge">AI</span></span>
                        </div>
                    </div>

                    <nav className="home-nav-links">
                        <a href="#features" className="home-nav-link">Capabilities</a>
                        <a href="#preview" className="home-nav-link">Intelligence Demo</a>
                        <a href="#workflow" className="home-nav-link">How It Works</a>
                        <a href="#compliance" className="home-nav-link">Security & GDPR</a>
                    </nav>

                    <div className="home-nav-actions">
                        {isAuthenticated ? (
                            <button
                                type="button"
                                className="home-btn-primary"
                                onClick={() => navigate("/dashboard")}
                            >
                                <span>Go to Dashboard</span>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="home-btn-ghost"
                                    onClick={() => navigate("/login")}
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    className="home-btn-primary"
                                    onClick={() => navigate("/login?mode=register")}
                                >
                                    <span>Get Started Free</span>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14" />
                                        <path d="m12 5 7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="home-hero">
                <div className="home-hero-glow" aria-hidden="true" />
                <div className="home-container">
                    <div className="home-hero-content">
                        <div className="home-hero-badge">
                            <span className="home-badge-dot" />
                            <span>Enterprise Conversation Intelligence • Powered by Faster-Whisper & Gemini AI</span>
                        </div>

                        <h1 className="home-hero-heading">
                            Turn Every Sales Call Into <br className="hero-break" />
                            <span className="home-text-gradient">Predictable Closed Revenue</span>
                        </h1>

                        <p className="home-hero-sub">
                            The sovereign intelligence platform for modern revenue teams. Transcribe, diarize, and score every prospect conversation in real time with objective AI pitch coaching and team performance analytics.
                        </p>

                        <div className="home-hero-cta-group">
                            <button
                                type="button"
                                className="home-btn-hero-primary"
                                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login?mode=register")}
                            >
                                <span>{isAuthenticated ? "Launch Dashboard" : "Start Free Team Workspace"}</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </button>
                            {!isAuthenticated && (
                                <button
                                    type="button"
                                    className="home-btn-hero-secondary"
                                    onClick={() => navigate("/login")}
                                >
                                    Sign In to Platform
                                </button>
                            )}
                        </div>

                        {/* Credibility & Proof Bar */}
                        <div className="home-proof-bar">
                            <div className="proof-item">
                                <span className="proof-val">99.4%</span>
                                <span className="proof-label">Transcription Precision</span>
                            </div>
                            <div className="proof-divider" />
                            <div className="proof-item">
                                <span className="proof-val">3.2x</span>
                                <span className="proof-label">Faster AE Onboarding</span>
                            </div>
                            <div className="proof-divider" />
                            <div className="proof-item">
                                <span className="proof-val">SOC-2</span>
                                <span className="proof-label">Type II & GDPR Compliant</span>
                            </div>
                            <div className="proof-divider" />
                            <div className="proof-item">
                                <span className="proof-val">0-100</span>
                                <span className="proof-label">Objective Pitch Scoring</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Live Demo Preview Section */}
            <section id="preview" className="home-preview-section">
                <div className="home-container">
                    <div className="home-section-header">
                        <span className="home-section-eyebrow">Interactive Intelligence Console</span>
                        <h2 className="home-section-title">See How SalesSense Analyzes Live Dialogue</h2>
                        <p className="home-section-sub">
                            Every call is automatically diarized by speaker and evaluated across 4 core sales competencies.
                        </p>
                    </div>

                    <div className="home-preview-window">
                        {/* Window Header */}
                        <div className="preview-window-bar">
                            <div className="preview-window-dots">
                                <span className="window-dot dot-red" />
                                <span className="window-dot dot-yellow" />
                                <span className="window-dot dot-green" />
                            </div>
                            <div className="preview-window-title">
                                🎙️ Enterprise ARR Expansion Call • 14 min 32 sec • Sales Rep: Sarah Jenkins
                            </div>
                            <div className="preview-tab-pills">
                                <button
                                    type="button"
                                    className={`preview-tab-pill ${activeTab === "transcript" ? "preview-tab-active" : ""}`}
                                    onClick={() => setActiveTab("transcript")}
                                >
                                    Speaker Diarization
                                </button>
                                <button
                                    type="button"
                                    className={`preview-tab-pill ${activeTab === "analysis" ? "preview-tab-active" : ""}`}
                                    onClick={() => setActiveTab("analysis")}
                                >
                                    AI Scorecard
                                </button>
                            </div>
                        </div>

                        {/* Window Body */}
                        <div className="preview-window-body">
                            {activeTab === "transcript" ? (
                                <div className="preview-transcript-flow">
                                    <div className="dialogue-block dialogue-agent">
                                        <div className="dialogue-meta">
                                            <span className="speaker-pill speaker-rep">👤 Sales Rep (Sarah J.)</span>
                                            <span className="timestamp-pill">00:04 - 00:32</span>
                                        </div>
                                        <p className="dialogue-text">
                                            "Thanks for making time today, David. In our last discussion, you mentioned security compliance was the primary bottleneck before rolling out to your 45-person engineering team. We support dedicated single-tenant VPC deployments with automated GDPR audit logging."
                                        </p>
                                    </div>

                                    <div className="dialogue-block dialogue-prospect">
                                        <div className="dialogue-meta">
                                            <span className="speaker-pill speaker-buyer">🏢 Prospect (David Miller, VP Eng)</span>
                                            <span className="timestamp-pill">00:34 - 00:58</span>
                                        </div>
                                        <p className="dialogue-text">
                                            "That addresses our main compliance concern directly. If the legal review clears, our budget authorization is confirmed for next quarter. What does the onboarding timeline look like for the initial cohort?"
                                        </p>
                                    </div>

                                    <div className="dialogue-block dialogue-agent">
                                        <div className="dialogue-meta">
                                            <span className="speaker-pill speaker-rep">👤 Sales Rep (Sarah J.)</span>
                                            <span className="timestamp-pill">01:01 - 01:28</span>
                                        </div>
                                        <p className="dialogue-text">
                                            "We can have your initial cohort provisioned within 48 hours using branded invite links. I'll send over the mutual deployment schedule and MSA draft right after this call."
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="preview-scorecard-grid">
                                    <div className="preview-score-card">
                                        <div className="score-ring-large">
                                            <svg width="84" height="84" viewBox="0 0 84 84">
                                                <circle cx="42" cy="42" r="34" stroke="#E2E8F0" strokeWidth="6" fill="none" />
                                                <circle
                                                    cx="42"
                                                    cy="42"
                                                    r="34"
                                                    stroke="#2563EB"
                                                    strokeWidth="6"
                                                    strokeDasharray="213.6"
                                                    strokeDashoffset="17"
                                                    strokeLinecap="round"
                                                    fill="none"
                                                    transform="rotate(-90 42 42)"
                                                />
                                            </svg>
                                            <div className="score-ring-num">94<span className="score-ring-denom">/100</span></div>
                                        </div>
                                        <div className="score-summary">
                                            <h3>Strong Pitch Execution</h3>
                                            <p>High conviction buyer signals with verified budget authority and mutual next steps locked.</p>
                                        </div>
                                    </div>

                                    <div className="preview-metrics-matrix">
                                        <div className="preview-metric-tile">
                                            <span className="metric-tile-label">Talk-to-Listen Ratio</span>
                                            <span className="metric-tile-val">42% / 58%</span>
                                            <span className="metric-tile-status text-emerald">✓ Ideal Discovery Range</span>
                                        </div>
                                        <div className="preview-metric-tile">
                                            <span className="metric-tile-label">Objections Handled</span>
                                            <span className="metric-tile-val">4 / 4 Cleared</span>
                                            <span className="metric-tile-status text-emerald">✓ Security objection resolved</span>
                                        </div>
                                        <div className="preview-metric-tile">
                                            <span className="metric-tile-label">Prospect Sentiment</span>
                                            <span className="metric-tile-val">High Conviction</span>
                                            <span className="metric-tile-status text-emerald">+84 Net Promoter Score</span>
                                        </div>
                                        <div className="preview-metric-tile">
                                            <span className="metric-tile-label">Key Coaching Recommendation</span>
                                            <span className="metric-tile-val">Timeline Clarification</span>
                                            <span className="metric-tile-status text-blue">Introduce MSA review earlier</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Capabilities Grid */}
            <section id="features" className="home-features-section">
                <div className="home-container">
                    <div className="home-section-header">
                        <span className="home-section-eyebrow">Enterprise Capabilities</span>
                        <h2 className="home-section-title">Engineered for High-Conviction Revenue Teams</h2>
                        <p className="home-section-sub">
                            Everything modern sales organizations require to scale rep performance and enforce sales methodology.
                        </p>
                    </div>

                    <div className="home-features-grid">
                        <div className="feature-card">
                            <div className="feature-icon-wrapper icon-blue">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="22" />
                                </svg>
                            </div>
                            <h3 className="feature-title">Dual-Engine Speaker Diarization</h3>
                            <p className="feature-desc">
                                Faster-Whisper coupled with spectral clustering separates sales agent dialogue from prospect objections with sub-second temporal precision.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper icon-gold">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="8" r="6" />
                                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                                </svg>
                            </div>
                            <h3 className="feature-title">Objective Gemini Pitch Scoring</h3>
                            <p className="feature-desc">
                                Automated 0-100 pitch evaluation measuring active listening, objection resolution, competitor positioning, and concrete next-step commitments.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper icon-purple">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <h3 className="feature-title">Multi-Tenant Team Architecture</h3>
                            <p className="feature-desc">
                                Onboard 5 to 500 reps under unified enterprise organizations with branded invite codes, capacity tracking, and role-based permissions (Admin, Manager, Rep).
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper icon-emerald">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6" y1="20" x2="6" y2="14" />
                                </svg>
                            </div>
                            <h3 className="feature-title">Executive Analytics Dashboard</h3>
                            <p className="feature-desc">
                                Cross-organization performance insights featuring time-series score trends, rep benchmark tables, call volume distribution, and AI coaching area rankings.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper icon-amber">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                            </div>
                            <h3 className="feature-title">Automated PDF & CSV Reports</h3>
                            <p className="feature-desc">
                                Export full conversation intelligence and AI evaluation summaries as formatted executive PDF documents or structured CSV files in one click.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper icon-teal">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <h3 className="feature-title">GDPR & Audit Compliance</h3>
                            <p className="feature-desc">
                                Comprehensive audit log middleware tracking sensitive actions, self-service GDPR data export and deletion, plus server-side JWT token blacklisting.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="workflow" className="home-workflow-section">
                <div className="home-container">
                    <div className="home-section-header">
                        <span className="home-section-eyebrow">The 3-Step Pipeline</span>
                        <h2 className="home-section-title">From Audio Recording to Deal Intelligence</h2>
                        <p className="home-section-sub">
                            Streamlined end-to-end processing with zero manual transcript tagging required.
                        </p>
                    </div>

                    <div className="workflow-steps-grid">
                        <div className="workflow-step-card">
                            <div className="step-number">01</div>
                            <h3 className="step-title">Upload Call Recording</h3>
                            <p className="step-desc">
                                Drop in sales audio files (.mp3, .wav, .m4a, .ogg) or connect directly to your VoIP call recording repository.
                            </p>
                        </div>

                        <div className="workflow-step-card">
                            <div className="step-number">02</div>
                            <h3 className="step-title">Diarize & Transcribe</h3>
                            <p className="step-desc">
                                Faster-Whisper accurately transcribes dialogue while speaker clustering aligns speaker turns with millisecond accuracy.
                            </p>
                        </div>

                        <div className="workflow-step-card">
                            <div className="step-number">03</div>
                            <h3 className="step-title">AI Coaching Scorecard</h3>
                            <p className="step-desc">
                                Receive instant 0-100 pitch evaluations, objection resolutions, buyer sentiment, and concrete manager coaching points.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security & Compliance Callout */}
            <section id="compliance" className="home-compliance-section">
                <div className="home-container">
                    <div className="compliance-card">
                        <div className="compliance-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        </div>
                        <div className="compliance-content">
                            <h3 className="compliance-title">Institutional Security & Enterprise Readiness</h3>
                            <p className="compliance-desc">
                                Built from the ground up for strict regulatory standards. Features token revocation on logout, PostgreSQL connection pooling, slowapi rate limiting, timing-attack mitigation on login, and zero customer audio retention for foundation model training.
                            </p>
                            <div className="compliance-tags">
                                <span className="comp-tag">🔒 AES-256 Encryption</span>
                                <span className="comp-tag">🛡️ Token Blacklist Revocation</span>
                                <span className="comp-tag">📋 Audit Logging Middleware</span>
                                <span className="comp-tag">🇪🇺 GDPR Right to be Forgotten</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom Call To Action Banner */}
            <section className="home-bottom-cta">
                <div className="home-container">
                    <div className="bottom-cta-card">
                        <h2 className="bottom-cta-heading">
                            Ready to Transform Your Sales Team's Win Rates?
                        </h2>
                        <p className="bottom-cta-sub">
                            Join high-growth sales organizations turning unstructured sales calls into predictable revenue.
                        </p>
                        <div className="bottom-cta-buttons">
                            <button
                                type="button"
                                className="home-btn-hero-primary"
                                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login?mode=register")}
                            >
                                <span>{isAuthenticated ? "Open SalesSense Dashboard" : "Create Free Enterprise Workspace"}</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Clean Professional Footer */}
            <footer className="home-footer">
                <div className="home-container">
                    <div className="footer-top">
                        <div className="footer-brand-col">
                            <div className="home-brand">
                                <div className="home-brand-icon">
                                    <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                                        <rect width="28" height="28" rx="8" fill="#1E293B" />
                                        <path d="M7 14.5L10 11.5L14 15.5L21 8.5" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="home-brand-title">SalesSense <span className="home-brand-badge">AI</span></span>
                            </div>
                            <p className="footer-brand-desc">
                                The sovereign conversation intelligence platform for enterprise revenue teams.
                            </p>
                        </div>

                        <div className="footer-links-col">
                            <span className="footer-col-title">Platform</span>
                            <a href="#features">Speech Diarization</a>
                            <a href="#features">Gemini Pitch Scoring</a>
                            <a href="#features">Multi-Tenancy Workspace</a>
                            <a href="#features">Manager Analytics</a>
                        </div>

                        <div className="footer-links-col">
                            <span className="footer-col-title">Security & Compliance</span>
                            <a href="#compliance">SOC-2 Type II</a>
                            <a href="#compliance">GDPR Data Privacy</a>
                            <a href="#compliance">Audit Trail Middleware</a>
                            <a href="#compliance">Token Revocation</a>
                        </div>

                        <div className="footer-links-col">
                            <span className="footer-col-title">Access</span>
                            <button type="button" className="footer-link-btn" onClick={() => navigate("/login")}>
                                Sign In
                            </button>
                            <button type="button" className="footer-link-btn" onClick={() => navigate("/login?mode=register")}>
                                Create Account
                            </button>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>© {new Date().getFullYear()} SalesSense AI. All rights reserved. Sovereign Sales Intelligence.</p>
                        <div className="footer-bottom-meta">
                            <span>PostgreSQL 16</span>
                            <span>•</span>
                            <span>FastAPI Backend</span>
                            <span>•</span>
                            <span>React 19 Frontend</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default HomePage;
