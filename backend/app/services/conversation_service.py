"""
Conversation Service
====================
Merges Faster-Whisper transcription segments with PyAnnote speaker
diarization segments to produce a unified conversation view:
*who said what*.

Algorithm
---------
1. Transcribe the audio → list of ``{start, end, text}`` segments.
2. Diarize the audio   → list of ``{speaker, start, end}`` segments.
3. For each transcription segment, find the speaker whose diarization
   segment has the **maximum time overlap**.
4. Merge consecutive segments from the same speaker into one entry.
"""

import logging
from typing import Any, Dict, List

from app.services.whisper_service import transcribe_audio_segments
from app.services.diarization_service import diarize_audio

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _compute_overlap(seg_a: Dict, seg_b: Dict) -> float:
    """Return the duration (in seconds) of overlap between two segments."""
    overlap_start = max(seg_a["start"], seg_b["start"])
    overlap_end = min(seg_a["end"], seg_b["end"])
    return max(0.0, overlap_end - overlap_start)


def _assign_speakers(
    transcription_segments: List[Dict],
    diarization_segments: List[Dict],
) -> List[Dict[str, Any]]:
    """Label every transcription segment with its best-matching speaker."""

    labeled: List[Dict[str, Any]] = []

    for t_seg in transcription_segments:
        best_speaker = "UNKNOWN"
        best_overlap = 0.0

        for d_seg in diarization_segments:
            overlap = _compute_overlap(t_seg, d_seg)
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = d_seg["speaker"]

        labeled.append({
            "speaker": best_speaker,
            "text": t_seg["text"],
            "start": t_seg["start"],
            "end": t_seg["end"],
        })

    return labeled


def _merge_consecutive(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge consecutive segments that share the same speaker."""

    if not segments:
        return []

    merged: List[Dict[str, Any]] = [segments[0].copy()]

    for seg in segments[1:]:
        if seg["speaker"] == merged[-1]["speaker"]:
            merged[-1]["text"] += " " + seg["text"]
            merged[-1]["end"] = max(merged[-1]["end"], seg["end"])
        else:
            merged.append(seg.copy())

    return merged


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_conversation(audio_path: str) -> List[Dict[str, Any]]:
    """Run transcription + diarization and merge the results.

    Args:
        audio_path: Path to the audio file on disk.

    Returns:
        A list of conversation turns::

            [
                {"speaker": "SPEAKER_00", "text": "Hello Sir"},
                {"speaker": "SPEAKER_01", "text": "I need information"},
                ...
            ]

    Raises:
        Any exception propagated from the underlying whisper or
        diarization services.
    """
    logger.info("Building conversation for: %s", audio_path)

    # Step 1 — transcribe (timestamped segments)
    transcription_segments = transcribe_audio_segments(audio_path)
    logger.info("Transcription: %d segment(s)", len(transcription_segments))

    # Step 2 — diarize (speaker segments)
    diarization_segments = diarize_audio(audio_path)
    logger.info("Diarization:   %d segment(s)", len(diarization_segments))

    # Step 3 — assign a speaker to each transcript segment
    labeled = _assign_speakers(transcription_segments, diarization_segments)

    # Step 4 — merge consecutive same-speaker segments
    conversation = _merge_consecutive(labeled)
    logger.info("Conversation:  %d turn(s)", len(conversation))

    return conversation
