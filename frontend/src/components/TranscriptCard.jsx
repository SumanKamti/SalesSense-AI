import { useEffect, useRef, useState } from "react";

function formatTime(seconds) {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function TranscriptCard({ conversation }) {
    const bottomRef = useRef(null);
    const [copied, setCopied] = useState(false);

    // Auto-scroll when new conversation arrives
    useEffect(() => {
        if (bottomRef.current && conversation && conversation.length > 0) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [conversation]);

    const handleCopy = async () => {
        if (!conversation || conversation.length === 0) return;
        const text = conversation
            .map((t) => {
                const role = t.speaker === "SPEAKER_00" ? "Sales Agent" : "Prospect";
                const time = `${formatTime(t.start)} - ${formatTime(t.end)}`;
                return `[${time}] ${role}: ${t.text}`;
            })
            .join("\n\n");

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy transcript:", err);
        }
    };

    if (!conversation || conversation.length === 0) {
        return (
            <div className="card transcript-card empty-card">
                <div className="card-header">
                    <h2 className="card-title">Conversation Transcript</h2>
                </div>
                <div className="empty-state">
                    <div className="empty-icon-wrapper">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            <line x1="8" y1="9" x2="16" y2="9" />
                            <line x1="8" y1="13" x2="14" y2="13" />
                        </svg>
                    </div>
                    <p className="empty-title">No transcript available</p>
                    <p className="empty-subtitle">Upload an audio recording above to generate diarized transcript turns.</p>
                </div>
            </div>
        );
    }

    const agentTurns = conversation.filter((t) => t.speaker === "SPEAKER_00").length;
    const customerTurns = conversation.length - agentTurns;

    return (
        <div className="card transcript-card">
            <div className="card-header">
                <div>
                    <h2 className="card-title">Conversation Transcript</h2>
                    <div className="transcript-meta-pills">
                        <span className="meta-pill">{conversation.length} Turns</span>
                        <span className="meta-pill agent-pill">{agentTurns} Agent</span>
                        <span className="meta-pill customer-pill">{customerTurns} Prospect</span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-secondary btn-sm"
                    title="Copy full transcript to clipboard"
                >
                    {copied ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Copied
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>

            <div className="chat-stream">
                {conversation.map((turn, idx) => {
                    const isAgent = turn.speaker === "SPEAKER_00";
                    const role = isAgent ? "Sales Agent" : "Prospect";

                    return (
                        <div
                            key={idx}
                            className={`chat-row ${isAgent ? "row-agent" : "row-customer"}`}
                        >
                            <div className="chat-avatar" title={role}>
                                {isAgent ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                )}
                            </div>
                            <div className="chat-bubble">
                                <div className="chat-meta">
                                    <span className="chat-role">{role}</span>
                                    {(turn.start !== undefined || turn.end !== undefined) && (
                                        <span className="chat-timestamp">
                                            {formatTime(turn.start)} – {formatTime(turn.end)}
                                        </span>
                                    )}
                                </div>
                                <p className="chat-text">{turn.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

export default TranscriptCard;