import { useState } from "react";
import Navbar from "../components/Navbar";
import UploadCard from "../components/UploadCard";
import TranscriptCard from "../components/TranscriptCard";
import AnalysisCard from "../components/AnalysisCard";

function Dashboard() {
    const [conversation, setConversation] = useState([]);

    const handleReset = () => {
        setConversation([]);
    };

    const hasConversation = conversation && conversation.length > 0;

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <div className="container">
                    {/* Upload / Audio Card */}
                    <UploadCard
                        onResult={setConversation}
                        conversationExists={hasConversation}
                        onReset={handleReset}
                    />

                    {/* Results Area */}
                    {hasConversation ? (
                        <div className="dashboard-results-grid">
                            <div className="dashboard-column transcript-column">
                                <TranscriptCard conversation={conversation} />
                            </div>
                            <div className="dashboard-column analysis-column">
                                <AnalysisCard conversation={conversation} />
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-empty-guide">
                            <div className="guide-card">
                                <div className="guide-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                </div>
                                <div className="guide-text">
                                    <h4>Speaker Diarization</h4>
                                    <p>Automatically separates speech between sales rep and prospect with accurate timestamps.</p>
                                </div>
                            </div>
                            <div className="guide-card">
                                <div className="guide-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                </div>
                                <div className="guide-text">
                                    <h4>Call Quality Score</h4>
                                    <p>Evaluates pitch delivery, active listening, and objection handling on a 100-point scale.</p>
                                </div>
                            </div>
                            <div className="guide-card">
                                <div className="guide-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                </div>
                                <div className="guide-text">
                                    <h4>Targeted Coaching</h4>
                                    <p>Delivers structured strengths, missed opportunities, and concrete coaching advice.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;