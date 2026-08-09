import { useState, useEffect, useMemo, useRef } from "react";
import api from "../services/api";

function UploadCard({ onResult, conversationExists, onReset }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Track elapsed time during analysis
    useEffect(() => {
        if (!loading) return;
        const timer = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [loading]);

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

    const handleFile = (file) => {
        if (file && file.type.startsWith("audio/")) {
            setSelectedFile(file);
            setError(null);
        } else if (file) {
            const ext = file.name.split(".").pop().toLowerCase();
            if (["wav", "mp3", "m4a", "ogg", "flac", "aac", "wma"].includes(ext)) {
                setSelectedFile(file);
                setError(null);
            } else {
                setError("Please select a valid audio file (e.g. .mp3, .wav, .m4a).");
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
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        if (onReset) {
            onReset();
        }
    };

    const handleAnalyze = async () => {
        setError(null);
        if (!selectedFile) {
            setError("Please select an audio file to analyze.");
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
            onResult(response.data.conversation);
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
                    <h2 className="card-title">Upload Sales Call</h2>
                    <p className="card-description">
                        Upload a recorded sales call audio file to generate speaker transcription and coaching insights.
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

            {!selectedFile ? (
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
                        accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
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
                        <p className="dropzone-hint">Supports MP3, WAV, M4A, OGG, or FLAC</p>
                    </div>
                </div>
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
                        <div className="audio-player-wrapper">
                            <audio controls src={audioUrl} className="audio-player" preload="metadata">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
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