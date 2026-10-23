import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "../services/api";

function LoginPage() {
    const [searchParams] = useSearchParams();
    const [isRegister, setIsRegister] = useState(false);
    const [teamOption, setTeamOption] = useState("create"); // "create" | "join" | "solo"
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        organization_name: "",
        invite_code: "",
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotToken, setForgotToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [forgotStep, setForgotStep] = useState(1);
    const [forgotMsg, setForgotMsg] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const navigate = useNavigate();

    // Auto-detect invite link parameter (?invite=CODE) or mode parameter (?mode=register)
    useEffect(() => {
        const inviteParam = searchParams.get("invite");
        const modeParam = searchParams.get("mode");
        if (inviteParam) {
            setIsRegister(true);
            setTeamOption("join");
            setFormData((prev) => ({ ...prev, invite_code: inviteParam.trim().toUpperCase() }));
        } else if (modeParam === "register") {
            setIsRegister(true);
        }
    }, [searchParams]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleTabSwitch = (toRegister) => {
        setIsRegister(toRegister);
        setError(null);
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMsg("");
        try {
            const res = await authAPI.forgotPassword(forgotEmail.trim());
            setForgotMsg(res.data.message || "Reset link generated.");
            if (res.data.reset_token) {
                setForgotToken(res.data.reset_token);
            }
            setForgotStep(2);
        } catch (err) {
            setForgotMsg(err.response?.data?.detail || "Failed to request password reset.");
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMsg("");
        try {
            const res = await authAPI.resetPassword(forgotToken.trim(), newPassword);
            setForgotMsg(res.data.message || "Password successfully reset! You can now sign in.");
            setTimeout(() => {
                setShowForgotModal(false);
                setForgotStep(1);
                setForgotToken("");
                setNewPassword("");
                setForgotMsg("");
            }, 2000);
        } catch (err) {
            setForgotMsg(err.response?.data?.detail || "Failed to reset password.");
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (isRegister && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match. Please verify both entries.");
            return;
        }

        if (isRegister && teamOption === "create" && !formData.organization_name.trim()) {
            setError("Please enter your company or organization name.");
            return;
        }

        if (isRegister && teamOption === "join" && !formData.invite_code.trim()) {
            setError("Please enter your team invite code.");
            return;
        }

        setLoading(true);

        try {
            if (isRegister) {
                const regData = {
                    full_name: formData.full_name.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                };
                if (teamOption === "create" && formData.organization_name.trim()) {
                    regData.organization_name = formData.organization_name.trim();
                } else if (teamOption === "join" && formData.invite_code.trim()) {
                    regData.invite_code = formData.invite_code.trim().toUpperCase();
                }

                await authAPI.register(regData);
            }

            const loginRes = await authAPI.login({
                email: formData.email.trim(),
                password: formData.password,
            });
            const { access_token } = loginRes.data;
            localStorage.setItem("salessense_token", access_token);

            const meRes = await authAPI.getMe();
            localStorage.setItem("salessense_user", JSON.stringify(meRes.data));

            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.data?.detail || "Authentication failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sovereign-viewport">
            {/* Soft Ambient Radial Lights (Spacious, Clean, Never Cluttered) */}
            <div className="sovereign-ambient-top" aria-hidden="true" />
            <div className="sovereign-ambient-bottom" aria-hidden="true" />

            <div className="sovereign-card-wrapper">
                {/* Royal Crest & Brand Seal */}
                <header className="sovereign-header">
                    <div className="sovereign-crest">
                        <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="32" height="32" rx="9" fill="url(#crest-gradient)" />
                            {/* Royal Crown & Waveform Vector */}
                            <path
                                d="M8 20L10.5 12L16 16.5L21.5 12L24 20H8Z"
                                stroke="#F7F8FA"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                            />
                            <circle cx="8" cy="19.5" r="1.2" fill="#E2B16A" />
                            <circle cx="16" cy="16.5" r="1.4" fill="#E2B16A" />
                            <circle cx="24" cy="19.5" r="1.2" fill="#E2B16A" />
                            <line x1="10" y1="23" x2="22" y2="23" stroke="#E2B16A" strokeWidth="1.6" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="crest-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#1E293B" />
                                    <stop offset="1" stopColor="#0B1120" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    <h1 className="sovereign-title">
                        SalesSense <span className="sovereign-pill">AI</span>
                    </h1>
                    <p className="sovereign-subtitle">
                        {isRegister
                            ? "Create an enterprise workspace for your revenue team"
                            : "Executive intelligence platform for sales leaders"}
                    </p>
                </header>

                {/* Segmented Mode Selector */}
                <div className="sovereign-tabs" role="tablist" aria-label="Authentication Mode">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!isRegister}
                        className={`sovereign-tab ${!isRegister ? "sovereign-tab-active" : ""}`}
                        onClick={() => handleTabSwitch(false)}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isRegister}
                        className={`sovereign-tab ${isRegister ? "sovereign-tab-active" : ""}`}
                        onClick={() => handleTabSwitch(true)}
                    >
                        Create Account
                    </button>
                </div>

                {/* Main Clear Form */}
                <form onSubmit={handleSubmit} className="sovereign-form" noValidate>
                    {/* Registration: Full Name */}
                    {isRegister && (
                        <div className="sovereign-group">
                            <label htmlFor="full_name" className="sovereign-label">
                                Full Name
                            </label>
                            <input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="e.g. Eleanor Vance"
                                className="sovereign-input"
                                autoComplete="name"
                            />
                        </div>
                    )}

                    {/* Work Email */}
                    <div className="sovereign-group">
                        <label htmlFor="email" className="sovereign-label">
                            Work Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@company.com"
                            className="sovereign-input"
                            autoComplete="username"
                            autoFocus
                        />
                    </div>

                    {/* Password */}
                    <div className="sovereign-group">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label htmlFor="password" className="sovereign-label">
                                Password
                            </label>
                            {!isRegister && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotModal(true);
                                        setForgotEmail(formData.email || "");
                                        setForgotStep(1);
                                        setForgotMsg("");
                                    }}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        fontSize: "12px",
                                        color: "var(--primary)",
                                        cursor: "pointer",
                                        fontWeight: "500",
                                        padding: 0,
                                    }}
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <div className="sovereign-input-wrapper">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="sovereign-input sovereign-input-has-btn"
                                autoComplete={isRegister ? "new-password" : "current-password"}
                            />
                            <button
                                type="button"
                                className="sovereign-eye-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Registration: Confirm Password */}
                    {isRegister && (
                        <div className="sovereign-group">
                            <label htmlFor="confirmPassword" className="sovereign-label">
                                Confirm Password
                            </label>
                            <div className="sovereign-input-wrapper">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="sovereign-input sovereign-input-has-btn"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="sovereign-eye-btn"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    title={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Registration: Clean Workspace Selection */}
                    {isRegister && (
                        <div className="sovereign-workspace-box">
                            <span className="sovereign-label">Select Workspace Role</span>
                            <div className="sovereign-role-row">
                                <button
                                    type="button"
                                    className={`sovereign-role-btn ${teamOption === "create" ? "sovereign-role-active" : ""}`}
                                    onClick={() => setTeamOption("create")}
                                >
                                    👑 New Company
                                </button>
                                <button
                                    type="button"
                                    className={`sovereign-role-btn ${teamOption === "join" ? "sovereign-role-active" : ""}`}
                                    onClick={() => setTeamOption("join")}
                                >
                                    🔑 Join Team
                                </button>
                                <button
                                    type="button"
                                    className={`sovereign-role-btn ${teamOption === "solo" ? "sovereign-role-active" : ""}`}
                                    onClick={() => setTeamOption("solo")}
                                >
                                    👤 Solo Rep
                                </button>
                            </div>

                            {/* Create Company field */}
                            {teamOption === "create" && (
                                <div className="sovereign-subfield">
                                    <label htmlFor="organization_name" className="sovereign-sublabel">
                                        Organization / Company Name
                                    </label>
                                    <input
                                        id="organization_name"
                                        name="organization_name"
                                        type="text"
                                        required
                                        value={formData.organization_name}
                                        onChange={handleChange}
                                        placeholder="e.g. Acme Corporation"
                                        className="sovereign-input"
                                    />
                                    <p className="sovereign-subhint">
                                        You will be appointed as the Team Administrator.
                                    </p>
                                </div>
                            )}

                            {/* Join with Invite field */}
                            {teamOption === "join" && (
                                <div className="sovereign-subfield">
                                    <label htmlFor="invite_code" className="sovereign-sublabel">
                                        Team Invitation Code
                                    </label>
                                    <input
                                        id="invite_code"
                                        name="invite_code"
                                        type="text"
                                        required
                                        value={formData.invite_code}
                                        onChange={handleChange}
                                        placeholder="e.g. ACME-GROWTH-8322"
                                        className="sovereign-input sovereign-code"
                                    />
                                    <p className="sovereign-subhint">
                                        Provided by your manager or team admin.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Notification */}
                    {error && (
                        <div className="sovereign-error" role="alert" aria-live="assertive">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Primary Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`sovereign-btn-primary ${loading ? "sovereign-btn-loading" : ""}`}
                    >
                        {loading ? (
                            <span className="sovereign-loading-content">
                                <span className="sovereign-spinner" aria-hidden="true" />
                                <span>{isRegister ? "Creating Workspace..." : "Signing in..."}</span>
                            </span>
                        ) : (
                            <span>{isRegister ? "Create Account & Workspace" : "Sign In to Dashboard"}</span>
                        )}
                    </button>
                </form>

                {/* Footer security note */}
                <footer className="sovereign-footer">
                    <span>Enterprise Security • 256-Bit Encryption • GDPR Ready</span>
                </footer>
            </div>

            {/* Password Reset Modal */}
            {showForgotModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 100,
                        padding: "20px",
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="forgot-modal-title"
                >
                    <div
                        style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "16px",
                            padding: "28px",
                            maxWidth: "420px",
                            width: "100%",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 id="forgot-modal-title" style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)" }}>
                                {forgotStep === 1 ? "Reset Password" : "Set New Password"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowForgotModal(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    fontSize: "18px",
                                    padding: "4px",
                                }}
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        </div>

                        {forgotMsg && (
                            <div
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    background: "var(--primary-subtle)",
                                    border: "1px solid var(--primary-border)",
                                    color: "var(--text-primary)",
                                }}
                                role="alert"
                            >
                                {forgotMsg}
                            </div>
                        )}

                        {forgotStep === 1 ? (
                            <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                    Enter the email associated with your SalesSense AI account to receive a reset token.
                                </p>
                                <div className="sovereign-group">
                                    <label htmlFor="forgot-email" className="sovereign-label">Account Email</label>
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        required
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="sovereign-input"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="sovereign-btn-primary"
                                    style={{ marginTop: "4px" }}
                                >
                                    {forgotLoading ? "Generating Token..." : "Generate Reset Token"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <div className="sovereign-group">
                                    <label htmlFor="forgot-token" className="sovereign-label">Reset Token</label>
                                    <input
                                        id="forgot-token"
                                        type="text"
                                        required
                                        value={forgotToken}
                                        onChange={(e) => setForgotToken(e.target.value)}
                                        placeholder="Paste your reset token here"
                                        className="sovereign-input"
                                    />
                                </div>
                                <div className="sovereign-group">
                                    <label htmlFor="new-password" className="sovereign-label">New Password (min 8 chars)</label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        required
                                        minLength={8}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="sovereign-input"
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                                    <button
                                        type="button"
                                        onClick={() => setForgotStep(1)}
                                        className="sovereign-role-btn"
                                        style={{ flex: 1 }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="sovereign-btn-primary"
                                        style={{ flex: 2 }}
                                    >
                                        {forgotLoading ? "Updating..." : "Update Password"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoginPage;
