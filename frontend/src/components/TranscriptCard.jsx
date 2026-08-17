import { useEffect, useRef, useState, useMemo } from "react";

function formatTime(seconds) {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function HighlightText({ text, query }) {
    if (!query || !query.trim()) {
        return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="search-highlight">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
}

function TranscriptCard({ conversation, activeAudioTime = null, onSeekAudio = null }) {
    const bottomRef = useRef(null);
    const activeRowRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [speakerFilter, setSpeakerFilter] = useState("all"); // 'all' | 'agent' | 'prospect'

    // Scroll active spoken turn into view smoothly during playback
    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    }, [activeAudioTime]);

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

    // Calculate metrics
    const stats = useMemo(() => {
        if (!conversation || conversation.length === 0) {
            return { total: 0, agentTurns: 0, prospectTurns: 0, agentRatio: 50, prospectRatio: 50 };
        }
        const agentTurns = conversation.filter((t) => t.speaker === "SPEAKER_00").length;
        const prospectTurns = conversation.length - agentTurns;
        const agentRatio = Math.round((agentTurns / conversation.length) * 100);
        const prospectRatio = 100 - agentRatio;
        return { total: conversation.length, agentTurns, prospectTurns, agentRatio, prospectRatio };
    }, [conversation]);

    // Filter conversation by search and speaker
    const filteredConversation = useMemo(() => {
        if (!conversation) return [];
        return conversation.filter((turn) => {
            const isAgent = turn.speaker === "SPEAKER_00";
            if (speakerFilter === "agent" && !isAgent) return false;
            if (speakerFilter === "prospect" && isAgent) return false;

            if (searchQuery.trim()) {
                return turn.text.toLowerCase().includes(searchQuery.toLowerCase().trim());
            }
            return true;
        });
    }, [conversation, speakerFilter, searchQuery]);

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

    return (
        <div className="card transcript-card">
            <div className="card-header">
                <div>
                    <h2 className="card-title">Conversation Transcript</h2>
                    <div className="transcript-meta-pills">
                        <span className="meta-pill">{stats.total} Turns</span>
                        <span className="meta-pill agent-pill">{stats.agentTurns} Agent ({stats.agentRatio}%)</span>
                        <span className="meta-pill customer-pill">{stats.prospectTurns} Prospect ({stats.prospectRatio}%)</span>
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

            {/* Talk-time balance indicator */}
            <div className="talk-ratio-wrapper" title={`Agent: ${stats.agentRatio}% | Prospect: ${stats.prospectRatio}%`}>
                <div className="talk-ratio-bar">
                    <div className="ratio-segment segment-agent" style={{ width: `${stats.agentRatio}%` }} />
                    <div className="ratio-segment segment-prospect" style={{ width: `${stats.prospectRatio}%` }} />
                </div>
                <div className="talk-ratio-labels">
                    <span className="ratio-label agent-color">Agent: {stats.agentRatio}%</span>
                    <span className="ratio-hint">Click any line to jump audio</span>
                    <span className="ratio-label prospect-color">Prospect: {stats.prospectRatio}%</span>
                </div>
            </div>

            {/* Search & Speaker Filter Controls */}
            <div className="transcript-controls">
                <div className="transcript-search-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search conversation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="transcript-search-input"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="search-clear-btn"
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="filter-pill-group">
                    <button
                        type="button"
                        className={`filter-pill ${speakerFilter === "all" ? "filter-pill-active" : ""}`}
                        onClick={() => setSpeakerFilter("all")}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${speakerFilter === "agent" ? "filter-pill-active" : ""}`}
                        onClick={() => setSpeakerFilter("agent")}
                    >
                        Agent
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${speakerFilter === "prospect" ? "filter-pill-active" : ""}`}
                        onClick={() => setSpeakerFilter("prospect")}
                    >
                        Prospect
                    </button>
                </div>
            </div>

            {/* Chat Stream */}
            <div className="chat-stream">
                {filteredConversation.length === 0 ? (
                    <div className="no-filter-results">
                        <p>No turns match your search.</p>
                    </div>
                ) : (
                    filteredConversation.map((turn, idx) => {
                        const isAgent = turn.speaker === "SPEAKER_00";
                        const role = isAgent ? "Sales Agent" : "Prospect";

                        // Active playback state check
                        const isActive =
                            activeAudioTime !== null &&
                            turn.start !== undefined &&
                            turn.end !== undefined &&
                            activeAudioTime >= turn.start &&
                            activeAudioTime <= turn.end;

                        return (
                            <div
                                key={idx}
                                ref={isActive ? activeRowRef : null}
                                onClick={() => onSeekAudio && turn.start !== undefined && onSeekAudio(turn.start)}
                                className={`chat-row ${isAgent ? "row-agent" : "row-customer"} ${isActive ? "row-active-speaking" : ""} ${onSeekAudio ? "chat-row-clickable" : ""}`}
                                title={onSeekAudio && turn.start !== undefined ? `Jump to ${formatTime(turn.start)}` : undefined}
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
                                    <p className="chat-text">
                                        <HighlightText text={turn.text} query={searchQuery} />
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

export default TranscriptCard;