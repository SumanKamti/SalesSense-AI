import { useEffect, useRef } from "react";

function formatTime(seconds) {
    if (isNaN(seconds)) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function TranscriptCard({ conversation }) {
    const bottomRef = useRef(null);

    // Auto-scroll to the bottom when new conversation data arrives
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [conversation]);

    if (!conversation || conversation.length === 0) {
        return (
            <div className="card transcript-card">
                <h2>Conversation</h2>
                <div className="empty-state">
                    <p className="placeholder-text">
                        Conversation will appear here after analysis...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card transcript-card">
            <h2>Conversation</h2>
            <div className="chat-container">
                {conversation.map((turn, idx) => {
                    // Map SPEAKER_00 to Sales Agent, all others to Customer
                    const isAgent = turn.speaker === "SPEAKER_00";
                    const role = isAgent ? "Sales Agent" : "Customer";

                    return (
                        <div
                            key={idx}
                            className={`chat-message ${isAgent ? "agent" : "customer"}`}
                        >
                            <div className="chat-bubble">
                                <div className="chat-header">
                                    <span className="chat-name">{role}</span>
                                    <span className="chat-time">
                                        {formatTime(turn.start)} - {formatTime(turn.end)}
                                    </span>
                                </div>
                                <p className="chat-text">{turn.text}</p>
                            </div>
                        </div>
                    );
                })}
                {/* Dummy div to scroll to */}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

export default TranscriptCard;