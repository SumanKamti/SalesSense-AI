import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import HistoryPage from "./pages/HistoryPage";
import CallDetailPage from "./pages/CallDetailPage";

function ProtectedRoute({ children }) {
    const token = localStorage.getItem("salessense_token");
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/history"
                    element={
                        <ProtectedRoute>
                            <HistoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/history/:id"
                    element={
                        <ProtectedRoute>
                            <CallDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;