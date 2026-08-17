"""
Lightweight Speaker Diarization Service
========================================
Uses ``resemblyzer`` (speaker embeddings) + ``spectralcluster`` / agglomerative
clustering to identify *who spoke when* in an audio file.

This is a **CPU-friendly** alternative to the heavy ``pyannote.audio``
pipeline. It runs in seconds rather than minutes on machines without a GPU.
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
    """Run lightweight speaker diarization on an audio file without time distortion.

    Algorithm
    ---------
    1. Load audio and resample to 16 kHz (resemblyzer requirement).
    2. Normalize volume WITHOUT silence trimming (preserving 100% time sync).
    3. Slide a 1.5-second window across the audio and compute speaker embeddings.
    4. Cluster the embeddings to separate agent vs prospect.
    5. Convert labels into timed ``{speaker, start, end}`` segments.

    Args:
        audio_path: Path to the audio file on disk.

    Returns:
        A list of speaker segments ``[{speaker, start, end}, ...]``.
    """
    from resemblyzer import VoiceEncoder, normalize_volume
    from spectralcluster import SpectralClusterer

    try:
        logger.info("Starting lightweight diarization for: %s", audio_path)

        # 1. Load audio (16kHz mono)
        wav, sr = librosa.load(audio_path, sr=16000, mono=True)
        total_duration = len(wav) / sr
        logger.info(
            "Audio loaded — %.1f seconds, %d Hz", total_duration, sr
        )

        # Very short audio — single speaker
        if total_duration < 1.5:
            logger.warning("Audio too short for diarization (< 1.5s).")
            return [{
                "speaker": "SPEAKER_00",
                "start": 0.0,
                "end": round(total_duration, 2),
            }]

        # 2. Normalize volume WITHOUT silence trimming (CRITICAL for real timestamp sync)
        wav = normalize_volume(wav, target_dBFS=-28, increase_only=True)

        # 3. Compute speaker embeddings
        encoder = VoiceEncoder(device="cpu")

        window_len = 1.5   # 1.5 second analysis window
        window_step = 0.5  # 0.5 second fine-grained resolution
        window_samples = int(window_len * sr)
        step_samples = int(window_step * sr)

        embeddings = []
        start = 0
        while start + window_samples <= len(wav):
            chunk = wav[start : start + window_samples]
            # Only embed if chunk has audible energy
            if np.max(np.abs(chunk)) > 0.01:
                emb = encoder.embed_utterance(chunk)
            else:
                emb = np.zeros(256)
            embeddings.append(emb)
            start += step_samples

        # Handle tail
        if start < len(wav) and (len(wav) - start) > int(0.3 * sr):
            chunk = wav[start:]
            if len(chunk) < window_samples:
                chunk = np.pad(chunk, (0, window_samples - len(chunk)))
            emb = encoder.embed_utterance(chunk)
            embeddings.append(emb)

        if len(embeddings) < 2:
            return [{
                "speaker": "SPEAKER_00",
                "start": 0.0,
                "end": round(total_duration, 2),
            }]

        embeddings_array = np.array(embeddings)
        
        # Replace silent zero embeddings with nearest valid embedding
        valid_indices = np.where(np.linalg.norm(embeddings_array, axis=1) > 0.1)[0]
        if len(valid_indices) > 0:
            for i in range(len(embeddings_array)):
                if np.linalg.norm(embeddings_array[i]) < 0.1:
                    nearest = valid_indices[np.argmin(np.abs(valid_indices - i))]
                    embeddings_array[i] = embeddings_array[nearest]

        # 4. Cluster embeddings (2 speakers expected for sales call: Agent & Prospect)
        clusterer = SpectralClusterer(
            min_clusters=2,
            max_clusters=4,
        )
        labels = clusterer.predict(embeddings_array)

        # 5. Convert to timed segments
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
