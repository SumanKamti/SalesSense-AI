import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="app-shell">
            <Navbar />
            
            <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "48px 32px" }}>
                    <h1 style={{
                        fontSize: "72px",
                        fontWeight: "800",
                        color: "var(--primary)",
                        margin: "0 0 12px 0",
                        lineHeight: "1",
                        fontFamily: "var(--font-display)"
                    }}>
                        404
                    </h1>
                    <h2 style={{
                        fontSize: "22px",
                        fontWeight: "700",
                        color: "var(--text-primary)",
                        marginBottom: "10px"
                    }}>
                        Page Not Found
                    </h2>
                    <p style={{
                        color: "var(--text-muted)",
                        marginBottom: "28px",
                        lineHeight: "1.5",
                        fontSize: "14px"
                    }}>
                        The page you are looking for doesn't exist or has been moved.
                    </p>
                    <button 
                        type="button"
                        onClick={() => navigate("/dashboard")}
                        className="btn-primary"
                        style={{ margin: "0 auto", padding: "10px 24px" }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </main>
        </div>
    );
}

export default NotFoundPage;
