import { useState, useEffect, useMemo, useRef } from "react";
import api from "../services/api";
import WaveformPlayer from "./WaveformPlayer";

function UploadCard({ onResult, conversationExists, onReset, onAudioTimeUpdate, audioSeekTime }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [error, setError] = useState(null);

    // Recording State
    const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'record'
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const streamRef = useRef(null);

    // Track elapsed time during analysis
    useEffect(() => {
        if (!loading) return;
        const timer = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [loading]);

    // Live Recording Duration Timer
    useEffect(() => {
        if (isRecording) {
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } else {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        };
    }, [isRecording]);

    // Cleanup media stream on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Derive audio preview URL and clean it up
    const audioUrl = useMemo(() => {
        return selectedFile ? URL.createObjectURL(selectedFile) : null;
    }, [selectedFile]);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    // File selection handlers
    const handleFile = (file) => {
        if (file && file.type.startsWith("audio/")) {
            setSelectedFile(file);
            setError(null);
        } else if (file) {
            const ext = file.name.split(".").pop().toLowerCase();
            if (["wav", "mp3", "m4a", "ogg", "flac", "aac", "wma", "webm"].includes(ext)) {
                setSelectedFile(file);
                setError(null);
            } else {
                setError("Please select a valid audio file (e.g. .mp3, .wav, .m4a, .webm).");
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setError(null);
        setRecordingDuration(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        if (onReset) {
            onReset();
        }
    };

    // Live Recording Handlers
    const startRecording = async () => {
        setError(null);
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            let mimeType = "audio/webm";
            if (!MediaRecorder.isTypeSupported("audio/webm")) {
                if (MediaRecorder.isTypeSupported("audio/mp4")) {
                    mimeType = "audio/mp4";
                } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
                    mimeType = "audio/ogg";
                } else {
                    mimeType = "";
                }
            }

            const mediaRecorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const recordedType = mimeType || "audio/wav";
                const ext = recordedType.includes("mp4") ? "m4a" : recordedType.includes("ogg") ? "ogg" : "webm";
                const blob = new Blob(audioChunksRef.current, { type: recordedType });
                const file = new File([blob], `live_call_recording_${Date.now()}.${ext}`, { type: recordedType });
                setSelectedFile(file);
                setIsRecording(false);

                // Stop tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                }
            };

            mediaRecorder.start(250); // Slice every 250ms
            setIsRecording(true);
            setRecordingDuration(0);
        } catch (err) {
            console.error("Microphone access error:", err);
            setError("Could not access microphone. Please grant microphone permission in your browser.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };

    const formatRecordingTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const handleAnalyze = async () => {
        setError(null);
        if (!selectedFile) {
            setError("Please select or record an audio conversation to analyze.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            setLoading(true);
            setElapsedTime(0);
            const response = await api.post(
                "/conversation/analyze",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            onResult(response.data);
        } catch (err) {
            console.error("Audio Analysis Error:", err);
            setError(err.response?.data?.detail || "Failed to analyze audio. Please check your backend connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="card upload-card">
            <div className="card-header">
                <div>
                    <h2 className="card-title">Sales Call Intelligence</h2>
                    <p className="card-description">
                        Record a live conversation or upload an audio file to extract diarized speaker dialogue, analyze objections, and track coaching metrics.
                    </p>
                </div>
                {conversationExists && (
                    <button type="button" onClick={handleRemoveFile} className="btn-secondary btn-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        New Call
                    </button>
                )}
            </div>

            {/* Mode Switcher Tabs */}
            {!selectedFile && (
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <button
                        type="button"
                        className={`filter-pill ${activeTab === "upload" ? "filter-pill-active" : ""}`}
                        onClick={() => setActiveTab("upload")}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload Audio File
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${activeTab === "record" ? "filter-pill-active" : ""}`}
                        onClick={() => setActiveTab("record")}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                        Record Live Call
                    </button>
                </div>
            )}

            {!selectedFile ? (
                activeTab === "upload" ? (
                    <div
                        className={`dropzone ${isDragging ? "dragging" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                fileInputRef.current && fileInputRef.current.click();
                            }
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            hidden
                            accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac,.webm"
                            onChange={handleFileChange}
                        />
                        <div className="dropzone-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div className="dropzone-text">
                            <p className="dropzone-title">Click to upload or drag & drop audio here</p>
                            <p className="dropzone-hint">Supports MP3, WAV, M4A, OGG, FLAC, or WEBM (long conversations supported)</p>
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            border: "2px dashed var(--border-strong)",
                            borderRadius: "12px",
                            padding: "36px 24px",
                            textAlign: "center",
                            backgroundColor: isRecording ? "rgba(239, 68, 68, 0.04)" : "var(--bg-subtle)",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {isRecording ? (
                            <div>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                                        color: "#ef4444",
                                        padding: "6px 14px",
                                        borderRadius: "20px",
                                        fontWeight: "600",
                                        fontSize: "14px",
                                        marginBottom: "16px",
                                    }}
                                >
                                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 1s infinite" }}></span>
                                    Recording Live Conversation...
                                </div>
                                <div style={{ fontSize: "36px", fontWeight: "700", fontFamily: "monospace", color: "var(--text-primary)", marginBottom: "20px" }}>
                                    {formatRecordingTime(recordingDuration)}
                                </div>
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="btn-primary"
                                    style={{ backgroundColor: "#ef4444", borderColor: "#ef4444", display: "inline-flex", alignItems: "center", gap: "8px" }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="4" y="4" width="16" height="16" rx="2" />
                                    </svg>
                                    Stop & Review Recording
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: "16px" }}>
                                    <button
                                        type="button"
                                        onClick={startRecording}
                                        style={{
                                            width: "68px",
                                            height: "68px",
                                            borderRadius: "50%",
                                            backgroundColor: "var(--primary)",
                                            color: "#fff",
                                            border: "none",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "0 4px 12px rgba(96, 165, 250, 0.4)",
                                            transition: "transform 0.15s ease",
                                        }}
                                        title="Start recording"
                                    >
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                            <line x1="12" y1="19" x2="12" y2="23" />
                                            <line x1="8" y1="23" x2="16" y2="23" />
                                        </svg>
                                    </button>
                                </div>
                                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                                    Click to Start Recording
                                </h3>
                                <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
                                    Speak naturally with your microphone. You can test pitch conversations, sales inquiries, or customer support dialogues.
                                </p>
                            </div>
                        )}
                    </div>
                )
            ) : (
                <div className="selected-file-container">
                    <div className="file-detail-card">
                        <div className="file-icon-wrapper">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <div className="file-info-text">
                            <div className="file-name" title={selectedFile.name}>{selectedFile.name}</div>
                            <div className="file-meta">
                                <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                                <span className="file-dot">•</span>
                                <span className="file-type">{selectedFile.name.split(".").pop().toUpperCase()} Audio</span>
                            </div>
                        </div>
                        {!loading && (
                            <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="file-remove-btn"
                                title="Remove file"
                                aria-label="Remove file"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {audioUrl && (
                        <WaveformPlayer
                            audioUrl={audioUrl}
                            onAudioTimeUpdate={onAudioTimeUpdate}
                            audioSeekTime={audioSeekTime}
                        />
                    )}

                    {!conversationExists && (
                        <button
                            type="button"
                            onClick={handleAnalyze}
                            disabled={loading}
                            className={`btn-primary ${loading ? "btn-loading" : ""}`}
                        >
                            {loading ? (
                                <>
                                    <span className="btn-spinner"></span>
                                    <span>Transcribing & Diarizing... ({elapsedTime}s)</span>
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    <span>Process & Transcribe Call</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="alert-box alert-error">
                    <div className="alert-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div className="alert-content">{error}</div>
                    <button type="button" onClick={() => setError(null)} className="alert-close" aria-label="Dismiss">
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

export default UploadCard;
