import { useState } from "react";
import Navbar from "../components/Navbar";
import UploadCard from "../components/UploadCard";
import TranscriptCard from "../components/TranscriptCard";
import AnalysisCard from "../components/AnalysisCard";

function Dashboard() {
    const [conversation, setConversation] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [activeAudioTime, setActiveAudioTime] = useState(null);
    const [audioSeekTime, setAudioSeekTime] = useState(null);

    const handleResult = (data) => {
        if (data && data.conversation) {
            setConversation(data.conversation);
            setConversationId(data.conversation_id || null);
        } else if (Array.isArray(data)) {
            setConversation(data);
            setConversationId(null);
        }
    };

    const handleReset = () => {
        setConversation([]);
        setConversationId(null);
        setActiveAudioTime(null);
        setAudioSeekTime(null);
    };

    const handleSeekAudio = (time) => {
        setAudioSeekTime(time);
        // Clear seek request so subsequent clicks on same timestamp register
        setTimeout(() => setAudioSeekTime(null), 100);
    };

    const hasConversation = conversation && conversation.length > 0;

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <div className="container">
                    <UploadCard
                        onResult={handleResult}
                        conversationExists={hasConversation}
                        onReset={handleReset}
                        onAudioTimeUpdate={setActiveAudioTime}
                        audioSeekTime={audioSeekTime}
                    />

                    {hasConversation ? (
                        <div className="dashboard-results-grid">
                            <div className="dashboard-column transcript-column">
                                <TranscriptCard
                                    conversation={conversation}
                                    activeAudioTime={activeAudioTime}
                                    onSeekAudio={handleSeekAudio}
                                />
                            </div>
                            <div className="dashboard-column analysis-column">
                                <AnalysisCard
                                    conversation={conversation}
                                    conversationId={conversationId}
                                />
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