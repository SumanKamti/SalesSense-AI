import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isRegister) {
                await authAPI.register({
                    full_name: formData.full_name,
                    email: formData.email,
                    password: formData.password,
                });
            }
            const loginRes = await authAPI.login({
                email: formData.email,
                password: formData.password,
            });
            const { access_token } = loginRes.data;
            localStorage.setItem("salessense_token", access_token);

            const meRes = await authAPI.getMe();
            localStorage.setItem("salessense_user", JSON.stringify(meRes.data));

            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.data?.detail || "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container-split">
                {/* Left Side: Brand & Feature Showcase */}
                <div className="auth-hero-pane">
                    <div className="auth-hero-brand">
                        <div className="brand-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 10v4" />
                                <path d="M6 6v12" />
                                <path d="M10 3v18" />
                                <path d="M14 7v10" />
                                <path d="M18 5v14" />
                                <path d="M22 10v4" />
                            </svg>
                        </div>
                        <div className="brand-title">
                            SalesSense <span className="brand-badge">AI</span>
                        </div>
                    </div>

                    <div className="auth-hero-content">
                        <h1 className="auth-hero-heading">
                            AI-Powered Conversation Intelligence for Modern Sales Teams
                        </h1>
                        <p className="auth-hero-sub">
                            Turn unstructured sales calls into actionable coaching scores, objection insights, and revenue opportunities.
                        </p>

                        <div className="auth-hero-features">
                            <div className="hero-feature-item">
                                <div className="hero-feature-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>Word-Level Diarization:</strong> Precision speaker alignment with zero voice blending.
                                </div>
                            </div>
                            <div className="hero-feature-item">
                                <div className="hero-feature-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>Objective Quality Scoring:</strong> 0-100 pitch evaluation calibrated by Gemini LLM.
                                </div>
                            </div>
                            <div className="hero-feature-item">
                                <div className="hero-feature-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>Targeted Coaching Playbooks:</strong> Concrete strengths and missed objection handling advice.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="auth-hero-footer">
                        <span>Enterprise Ready • Private SQLite Storage</span>
                    </div>
                </div>

                {/* Right Side: Auth Form Card */}
                <div className="auth-form-pane">
                    <div className="auth-form-header">
                        <h2 className="auth-heading">
                            {isRegister ? "Create your account" : "Sign in to SalesSense"}
                        </h2>
                        <p className="auth-subheading">
                            {isRegister
                                ? "Enter your details to start analyzing sales audio"
                                : "Welcome back! Enter your credentials to continue"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {isRegister && (
                            <div className="form-group">
                                <label htmlFor="full_name" className="form-label">Full Name</label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Jane Doe"
                                    className="form-input"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Work Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@company.com"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="form-input"
                            />
                        </div>

                        {error && (
                            <div className="alert-box alert-error">
                                <div className="alert-content">{error}</div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`btn-primary btn-auth-submit ${loading ? "btn-loading" : ""}`}
                        >
                            {loading ? (
                                <>
                                    <span className="btn-spinner"></span>
                                    <span>{isRegister ? "Creating account..." : "Signing in..."}</span>
                                </>
                            ) : (
                                <span>{isRegister ? "Create Free Account" : "Sign In to Dashboard"}</span>
                            )}
                        </button>
                    </form>

                    <div className="auth-toggle">
                        <span>
                            {isRegister ? "Already have an account?" : "Don't have an account yet?"}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError(null);
                            }}
                            className="auth-toggle-btn"
                        >
                            {isRegister ? "Sign In" : "Create Account"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
