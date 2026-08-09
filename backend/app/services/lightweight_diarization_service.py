"""
Lightweight Speaker Diarization Service
========================================
Uses ``resemblyzer`` (speaker embeddings) + ``spectralcluster`` to identify
*who spoke when* in an audio file.

This is a **CPU-friendly** alternative to the heavy ``pyannote.audio``
pipeline.  It runs in seconds rather than minutes on machines without a
GPU.

The public API (``diarize_audio``) returns the exact same data structure
as the pyannote-based service so all downstream code works unchanged.
"""

import logging
from typing import Any, Dict, List

import librosa
import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_segments_from_labels(
    labels: np.ndarray,
    window_step: float,
    total_duration: float,
) -> List[Dict[str, Any]]:
    """Convert a sequence of per-window speaker labels into timed segments.

    Args:
        labels: Array of integer speaker labels, one per window.
        window_step: Time step (in seconds) between consecutive windows.
        total_duration: Total audio duration in seconds.

    Returns:
        Merged list of ``{speaker, start, end}`` dicts.
    """
    if len(labels) == 0:
        return []

    segments: List[Dict[str, Any]] = []
    current_label = labels[0]
    seg_start = 0.0

    for i in range(1, len(labels)):
        if labels[i] != current_label:
            seg_end = round(i * window_step, 2)
            segments.append({
                "speaker": f"SPEAKER_{int(current_label):02d}",
                "start": round(seg_start, 2),
                "end": seg_end,
            })
            current_label = labels[i]
            seg_start = seg_end

    # Close the last segment
    segments.append({
        "speaker": f"SPEAKER_{int(current_label):02d}",
        "start": round(seg_start, 2),
        "end": round(total_duration, 2),
    })

    return segments


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def diarize_audio(audio_path: str) -> List[Dict[str, Any]]:
    """Run lightweight speaker diarization on an audio file.

    Algorithm
    ---------
    1. Load and resample audio to 16 kHz (resemblyzer requirement).
    2. Run Voice Activity Detection (VAD) via resemblyzer to find voiced
       regions and compute a continuous mel-spectrogram.
    3. Slide a 1.5-second window across the audio and compute a 256-dim
       speaker embedding for each window using resemblyzer's pretrained
       encoder.
    4. Cluster the embeddings with Spectral Clustering to discover the
       number of speakers automatically.
    5. Convert the per-window labels into timed ``{speaker, start, end}``
       segments.

    Args:
        audio_path: Path to the audio file on disk.

    Returns:
        A list of speaker segments, each containing:
        - ``speaker``  – label assigned (e.g. ``SPEAKER_00``)
        - ``start``    – segment start time in seconds
        - ``end``      – segment end time in seconds

    Raises:
        DiarizationError: If processing fails.
    """
    from resemblyzer import VoiceEncoder, preprocess_wav
    from spectralcluster import SpectralClusterer

    try:
        logger.info("Starting lightweight diarization for: %s", audio_path)

        # 1. Load audio ------------------------------------------------
        wav, sr = librosa.load(audio_path, sr=16000, mono=True)
        total_duration = len(wav) / sr
        logger.info(
            "Audio loaded — %.1f seconds, %d Hz", total_duration, sr
        )

        # Very short audio — treat as single speaker
        if total_duration < 2.0:
            logger.warning("Audio too short for diarization (< 2s).")
            return [{
                "speaker": "SPEAKER_00",
                "start": 0.0,
                "end": round(total_duration, 2),
            }]

        # 2. Preprocess (trim silence, normalise) ----------------------
        wav = preprocess_wav(wav, source_sr=sr)

        # 3. Compute speaker embeddings --------------------------------
        encoder = VoiceEncoder(device="cpu")

        # Sliding window: 1.5s windows with 0.75s step
        window_len = 1.5  # seconds
        window_step = 0.75  # seconds
        window_samples = int(window_len * sr)
        step_samples = int(window_step * sr)

        embeddings = []
        start = 0
        while start + window_samples <= len(wav):
            chunk = wav[start : start + window_samples]
            emb = encoder.embed_utterance(chunk)
            embeddings.append(emb)
            start += step_samples

        # Handle remaining audio if it's long enough
        if start < len(wav) and (len(wav) - start) > int(0.5 * sr):
            chunk = wav[start:]
            # Pad to minimum length if needed
            if len(chunk) < int(0.5 * sr):
                chunk = np.pad(chunk, (0, int(0.5 * sr) - len(chunk)))
            emb = encoder.embed_utterance(chunk)
            embeddings.append(emb)

        if len(embeddings) < 2:
            logger.warning("Not enough windows for clustering.")
            return [{
                "speaker": "SPEAKER_00",
                "start": 0.0,
                "end": round(total_duration, 2),
            }]

        embeddings_array = np.array(embeddings)
        logger.info("Computed %d embeddings, clustering...", len(embeddings))

        # 4. Cluster embeddings ----------------------------------------
        clusterer = SpectralClusterer(
            min_clusters=2,
            max_clusters=8,
        )
        labels = clusterer.predict(embeddings_array)

        n_speakers = len(set(labels))
        logger.info("Found %d speaker(s).", n_speakers)

        # 5. Convert to timed segments ---------------------------------
        segments = _build_segments_from_labels(
            labels, window_step, total_duration
        )

        logger.info(
            "Lightweight diarization complete — %d segment(s).",
            len(segments),
        )
        return segments

    except Exception as exc:
        logger.exception("Lightweight diarization failed for: %s", audio_path)
        from app.services.diarization_service import DiarizationError

        raise DiarizationError(
            f"Failed to diarize audio file '{audio_path}': {exc}"
        ) from exc
