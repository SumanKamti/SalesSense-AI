import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import HistoryPage from "./pages/HistoryPage";
import CallDetailPage from "./pages/CallDetailPage";
import TeamPage from "./pages/TeamPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import HomePage from "./pages/HomePage";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFoundPage from "./pages/NotFoundPage";

function ProtectedRoute({ children }) {
    const token = localStorage.getItem("salessense_token");
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function App() {
    return (
        <ErrorBoundary>
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
                    <Route
                        path="/team"
                        element={
                            <ProtectedRoute>
                                <TeamPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/analytics"
                        element={
                            <ProtectedRoute>
                                <AnalyticsDashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<HomePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;