import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === null || seconds === undefined) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function WaveformPlayer({
    audioUrl,
    onAudioTimeUpdate,
    audioSeekTime,
    onLoaded,
}) {
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize WaveSurfer
    useEffect(() => {
        if (!containerRef.current || !audioUrl) return;

        setIsLoading(true);

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const waveColor = isDark ? "#334155" : "#cbd5e1";
        const progressColor = isDark ? "#60a5fa" : "#2563eb";
        const cursorColor = isDark ? "#93c5fd" : "#1d4ed8";

        const ws = WaveSurfer.create({
            container: containerRef.current,
            url: audioUrl,
            waveColor: waveColor,
            progressColor: progressColor,
            cursorColor: cursorColor,
            cursorWidth: 2,
            height: 60,
            barWidth: 3,
            barGap: 2,
            barRadius: 2,
            normalize: true,
            dragToSeek: true,
        });

        ws.on("ready", (d) => {
            setDuration(d);
            setIsLoading(false);
            if (onLoaded) onLoaded(d);
        });

        ws.on("timeupdate", (t) => {
            setCurrentTime(t);
            if (onAudioTimeUpdate) {
                onAudioTimeUpdate(t);
            }
        });

        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => {
            setIsPlaying(false);
            setCurrentTime(0);
        });

        wavesurferRef.current = ws;

        return () => {
            ws.destroy();
            wavesurferRef.current = null;
        };
    }, [audioUrl]);

    // Update WaveSurfer waveform colors dynamically when user switches light/dark theme
    useEffect(() => {
        const updateThemeColors = () => {
            if (!wavesurferRef.current) return;
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            wavesurferRef.current.setOptions({
                waveColor: isDark ? "#334155" : "#cbd5e1",
                progressColor: isDark ? "#60a5fa" : "#2563eb",
                cursorColor: isDark ? "#93c5fd" : "#1d4ed8",
            });
        };

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
                    updateThemeColors();
                }
            }
        });

        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        return () => observer.disconnect();
    }, []);

    // External seek requests (e.g. from clicking transcript timestamp)
    useEffect(() => {
        if (
            audioSeekTime !== null &&
            audioSeekTime !== undefined &&
            wavesurferRef.current &&
            !isLoading
        ) {
            wavesurferRef.current.setTime(audioSeekTime);
            wavesurferRef.current.play().catch(() => {});
        }
    }, [audioSeekTime, isLoading]);

    const togglePlay = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
        }
    };

    const skipTime = (offset) => {
        if (wavesurferRef.current) {
            const nextTime = Math.max(0, Math.min(duration, currentTime + offset));
            wavesurferRef.current.setTime(nextTime);
        }
    };

    const cyclePlaybackRate = () => {
        const rates = [1, 1.25, 1.5, 2, 0.75];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const nextRate = rates[nextIdx];
        setPlaybackRate(nextRate);
        if (wavesurferRef.current) {
            wavesurferRef.current.setPlaybackRate(nextRate);
        }
    };

    const toggleMute = () => {
        if (wavesurferRef.current) {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            wavesurferRef.current.setMuted(nextMuted);
        }
    };

    return (
        <div className="waveform-player-container">
            {/* Waveform Visualization Canvas */}
            <div className="waveform-visual-wrapper">
                {isLoading && (
                    <div className="waveform-loading-overlay">
                        <span className="btn-spinner btn-spinner-dark"></span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500" }}>
                            Rendering audio waveform...
                        </span>
                    </div>
                )}
                <div ref={containerRef} className="waveform-canvas-host" />
            </div>

            {/* Controls Bar */}
            <div className="player-main-controls waveform-controls">
                <button
                    type="button"
                    className="btn-play-pause"
                    onClick={togglePlay}
                    disabled={isLoading}
                    title={isPlaying ? "Pause" : "Play"}
                    aria-label={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                </button>

                <button
                    type="button"
                    className="btn-player-sub"
                    onClick={() => skipTime(-10)}
                    disabled={isLoading}
                    title="Rewind 10 seconds"
                    aria-label="Rewind 10s"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 4v6h6" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    <span>-10s</span>
                </button>

                <button
                    type="button"
                    className="btn-player-sub"
                    onClick={() => skipTime(10)}
                    disabled={isLoading}
                    title="Forward 10 seconds"
                    aria-label="Forward 10s"
                >
                    <span>+10s</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                </button>

                <div className="player-time-badge">
                    <span className="player-time">{formatTime(currentTime)}</span>
                    <span className="player-time-sep">/</span>
                    <span className="player-time player-duration">{formatTime(duration)}</span>
                </div>

                <div style={{ flex: 1 }} />

                <button
                    type="button"
                    className="btn-player-sub"
                    onClick={toggleMute}
                    disabled={isLoading}
                    title={isMuted ? "Unmute" : "Mute"}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                    )}
                </button>

                <button
                    type="button"
                    className="btn-playback-rate"
                    onClick={cyclePlaybackRate}
                    disabled={isLoading}
                    title="Playback Speed"
                    aria-label="Playback speed"
                >
                    {playbackRate}x
                </button>
            </div>
        </div>
    );
}

export default WaveformPlayer;
