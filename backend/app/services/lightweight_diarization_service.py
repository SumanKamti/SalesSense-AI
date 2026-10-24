"""
Lightweight Speaker Diarization Service
========================================
Uses ``resemblyzer`` (speaker embeddings) + ``spectralcluster`` / agglomerative
clustering to identify *who spoke when* in an audio file.

This is a **CPU-friendly** alternative to the heavy ``pyannote.audio``
pipeline. It runs in seconds rather than minutes on machines without a GPU.
"""

import logging
import os
from typing import Any, Dict, List

import librosa
import numpy as np

from app.services.audio_preprocessing import preprocess_speech_audio

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


def _smooth_labels(labels: np.ndarray, window: int = 3) -> np.ndarray:
    """Apply running majority filter over window labels to eliminate rapid acoustic oscillation."""
    if len(labels) < window:
        return labels
    smoothed = np.copy(labels)
    half = window // 2
    for i in range(half, len(labels) - half):
        neighborhood = labels[i - half : i + half + 1]
        vals, counts = np.unique(neighborhood, return_counts=True)
        smoothed[i] = vals[np.argmax(counts)]
    return smoothed


def _detect_single_speaker(valid_embeddings: np.ndarray) -> bool:
    """Check if all valid speech embeddings belong to a single speaker."""
    if len(valid_embeddings) < 4:
        return True

    norms = np.linalg.norm(valid_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1e-10
    normed = valid_embeddings / norms

    sim_matrix = np.dot(normed, normed.T)
    triu_indices = np.triu_indices_from(sim_matrix, k=1)
    if len(triu_indices[0]) == 0:
        return True

    sim_values = sim_matrix[triu_indices]
    mean_sim = float(np.mean(sim_values))
    min_sim = float(np.percentile(sim_values, 10))
    std_sim = float(np.std(sim_values))

    logger.info(
        "Speaker similarity: mean=%.3f, p10=%.3f, std=%.3f",
        mean_sim, min_sim, std_sim
    )
    # Pre-clustering detection:
    # Only declare single speaker upfront if similarity is exceptionally high and consistent across the entire file.
    # On phone calls, telephone codecs inflate baseline similarity, so threshold is safely set to >0.93.
    if (
        (len(valid_embeddings) < 15 and mean_sim > 0.92) or
        mean_sim > 0.94 or
        (min_sim > 0.86 and std_sim < 0.025)
    ):
        return True
    return False


def _verify_cluster_separation(embeddings: np.ndarray, labels: np.ndarray) -> bool:
    """Verify whether 2 clusters genuinely represent 2 distinct speakers rather than an artificial split of 1 person.

    Returns:
        True if 2 distinct speakers exist; False if it's actually 1 speaker.
    """
    unique_labels = np.unique(labels)
    if len(unique_labels) < 2:
        return False

    c0 = embeddings[labels == unique_labels[0]]
    c1 = embeddings[labels == unique_labels[1]]

    # If one cluster is negligible (< 1% of speech or fewer than 3 chunks), consider single speaker
    if len(c0) < 3 or len(c1) < 3 or len(c0) / len(embeddings) < 0.01 or len(c1) / len(embeddings) < 0.01:
        logger.info("Cluster separation check: one cluster is negligible (<1%% or <3 frames) -> single speaker.")
        return False

    try:
        from sklearn.metrics import silhouette_score
        # Compute cosine distance silhouette score
        sil = silhouette_score(embeddings, labels, metric="cosine")
        logger.info("Diarization 2-cluster silhouette score: %.3f", sil)

        # On phone/VoIP audio, phone filters lower the silhouette; 0.07 ensures legitimate caller dialogue is preserved
        if sil < 0.07:
            logger.info("Silhouette score (%.3f) is below two-speaker threshold (0.07) -> single speaker.", sil)
            return False

        # Check between-centroid cosine similarity
        norm_c0 = np.mean(c0, axis=0)
        norm_c1 = np.mean(c1, axis=0)
        norm_c0 /= (np.linalg.norm(norm_c0) + 1e-10)
        norm_c1 /= (np.linalg.norm(norm_c1) + 1e-10)
        centroid_sim = float(np.dot(norm_c0, norm_c1))
        logger.info("Centroid cosine similarity between clusters: %.3f", centroid_sim)

        # If centroids are almost identical (> 0.94), it's the same person
        if centroid_sim > 0.94:
            logger.info("Centroid similarity (%.3f) too high -> single speaker.", centroid_sim)
            return False

        return True
    except Exception as e:
        logger.warning("Could not evaluate cluster separation: %s", e)
        return True


def diarize_audio(audio_path: str) -> List[Dict[str, Any]]:
    """Run lightweight speaker diarization on an audio file without time distortion.

    Algorithm
    ---------
    1. Preprocess audio to filter phone line noise and normalize volume.
    2. Resample to 16 kHz (resemblyzer requirement).
    3. Slide a 1.2-second window with 0.25-second step across speech audio.
    4. Cluster the embeddings to separate agent vs prospect.
    5. Convert labels into timed ``{speaker, start, end}`` segments.

    Args:
        audio_path: Path to the audio file on disk.

    Returns:
        A list of speaker segments ``[{speaker, start, end}, ...]``.
    """
    from resemblyzer import VoiceEncoder, normalize_volume
    from spectralcluster import SpectralClusterer

    audio_to_diarize, is_temp = preprocess_speech_audio(audio_path)

    try:
        logger.info("Starting lightweight diarization for: %s", audio_path)

        # 1. Load audio (16kHz mono)
        wav, sr = librosa.load(audio_to_diarize, sr=16000, mono=True)
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

        # 1.2 second analysis window and 0.25 second step for fine-grained speaker boundary tracking
        window_len = 1.2
        window_step = 0.25
        window_samples = int(window_len * sr)
        step_samples = int(window_step * sr)

        embeddings = []
        start = 0
        while start + window_samples <= len(wav):
            chunk = wav[start : start + window_samples]
            # Embed if chunk has speech energy (> -60 dBFS)
            if np.max(np.abs(chunk)) > 0.001:
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

            # 4. Check if audio is a single speaker
            if _detect_single_speaker(embeddings_array[valid_indices]):
                logger.info("Single speaker detected across audio — assigning all to SPEAKER_00.")
                return [{
                    "speaker": "SPEAKER_00",
                    "start": 0.0,
                    "end": round(total_duration, 2),
                }]

        # 5. Cluster embeddings using Agglomerative Clustering on unit-normalized vectors
        try:
            from sklearn.cluster import AgglomerativeClustering
            # Normalize embeddings to unit sphere
            norms = np.maximum(np.linalg.norm(embeddings_array, axis=1, keepdims=True), 1e-10)
            normed_embeddings = embeddings_array / norms

            # Ward linkage on unit-normalized vectors minimizes within-cluster variance
            clusterer = AgglomerativeClustering(
                n_clusters=2,
                linkage="ward",
            )
            raw_labels = clusterer.fit_predict(normed_embeddings)
        except Exception as cluster_err:
            logger.warning("Agglomerative clustering failed (%s); falling back to spectral.", cluster_err)
            clusterer = SpectralClusterer(min_clusters=2, max_clusters=2)
            raw_labels = clusterer.predict(embeddings_array)

        # Apply smoothing to eliminate rapid acoustic blips
        labels = _smooth_labels(raw_labels, window=3)

        # 6. Post-clustering check: verify if the 2 clusters are genuinely distinct speakers
        if len(valid_indices) > 0 and not _verify_cluster_separation(embeddings_array[valid_indices], labels[valid_indices]):
            logger.info("Post-clustering separation check determined audio is a single speaker.")
            return [{
                "speaker": "SPEAKER_00",
                "start": 0.0,
                "end": round(total_duration, 2),
            }]

        # 7. Convert to timed segments
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
    finally:
        if is_temp and os.path.exists(audio_to_diarize):
            try:
                os.remove(audio_to_diarize)
            except OSError:
                pass
