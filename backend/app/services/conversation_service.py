"""
Conversation Service
====================
Merges Faster-Whisper word-level transcription with speaker diarization
segments to produce a clean, accurate, and granular conversation view:
*who said what*.

Algorithm
---------
1. Transcribe audio with word-level timestamps via Faster-Whisper.
2. Diarize the audio into speaker time intervals.
3. Map every spoken word to its corresponding speaker.
4. Filter transient single-word acoustic flickers.
5. Group contiguous words from the same speaker into natural conversation turns.
"""

import logging
from typing import Any, Dict, List

from app.services.whisper_service import transcribe_audio_words, transcribe_audio_segments
from app.services.diarization_service import diarize_audio

logger = logging.getLogger(__name__)


def _find_speaker_for_time(mid_time: float, diarization_segments: List[Dict]) -> str:
    """Find the active speaker at a given timestamp."""
    for seg in diarization_segments:
        if seg["start"] <= mid_time <= seg["end"]:
            return seg["speaker"]
    
    # Fallback to closest segment if between gaps
    closest_speaker = "SPEAKER_00"
    min_dist = float("inf")
    for seg in diarization_segments:
        dist = min(abs(seg["start"] - mid_time), abs(seg["end"] - mid_time))
        if dist < min_dist:
            min_dist = dist
            closest_speaker = seg["speaker"]
    return closest_speaker


def _group_words_into_turns(
    words: List[Dict[str, Any]],
    diarization_segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Assign speakers at the word level and group them into natural turns."""
    if not words:
        return []

    # 1. Assign raw speaker to each word
    labeled_words = []
    for w in words:
        mid_time = (w["start"] + w["end"]) / 2.0
        speaker = _find_speaker_for_time(mid_time, diarization_segments)
        labeled_words.append({
            "word": w["word"],
            "start": w["start"],
            "end": w["end"],
            "speaker": speaker,
        })

    # 2. Smooth single-word flickers (e.g. A A A B A A A -> A unless pause >= 0.8s)
    n = len(labeled_words)
    if n > 2:
        for i in range(1, n - 1):
            prev_spk = labeled_words[i - 1]["speaker"]
            curr_spk = labeled_words[i]["speaker"]
            next_spk = labeled_words[i + 1]["speaker"]
            pause_before = labeled_words[i]["start"] - labeled_words[i - 1]["end"]
            pause_after = labeled_words[i + 1]["start"] - labeled_words[i]["end"]

            # If isolated word flanked by same speaker without long pause, smooth it
            if prev_spk == next_spk and curr_spk != prev_spk and pause_before < 0.6 and pause_after < 0.6:
                labeled_words[i]["speaker"] = prev_spk

    # 3. Group contiguous words of the same speaker into conversation turns
    turns: List[Dict[str, Any]] = []
    current_turn: Dict[str, Any] = {
        "speaker": labeled_words[0]["speaker"],
        "start": labeled_words[0]["start"],
        "end": labeled_words[0]["end"],
        "text": labeled_words[0]["word"].strip(),
    }

    for w in labeled_words[1:]:
        word_text = w["word"]
        is_same_speaker = (w["speaker"] == current_turn["speaker"])
        pause = w["start"] - current_turn["end"]

        # If same speaker and reasonable pause (< 3.0s), append to current turn
        if is_same_speaker and pause < 3.0:
            if word_text.startswith(" ") or not current_turn["text"]:
                current_turn["text"] += word_text
            else:
                current_turn["text"] += " " + word_text.strip()
            current_turn["end"] = w["end"]
        else:
            # Finalize current turn
            current_turn["text"] = current_turn["text"].strip()
            if current_turn["text"]:
                turns.append(current_turn)
            # Start new turn
            current_turn = {
                "speaker": w["speaker"],
                "start": w["start"],
                "end": w["end"],
                "text": word_text.strip(),
            }

    # Finalize last turn
    current_turn["text"] = current_turn["text"].strip()
    if current_turn["text"]:
        turns.append(current_turn)

    return turns


def build_conversation(audio_path: str) -> List[Dict[str, Any]]:
    """Run transcription + diarization and produce granular conversation turns.

    Args:
        audio_path: Path to the audio file on disk.

    Returns:
        A list of conversation turns:
            [
                {"speaker": "SPEAKER_00", "start": 0.0, "end": 4.2, "text": "Hello, my name is Steven."},
                {"speaker": "SPEAKER_01", "start": 4.5, "end": 6.1, "text": "Yes, hi there."},
                ...
            ]
    """
    logger.info("Building conversation for: %s", audio_path)

    # Step 1 — Transcribe word-level timestamped tokens
    words = transcribe_audio_words(audio_path)
    logger.info("Transcription: %d word(s) extracted", len(words))

    # Fallback to segment-level if words are empty
    if not words:
        transcription_segments = transcribe_audio_segments(audio_path)
        diarization_segments = diarize_audio(audio_path)
        # Simple segment fallback
        return [
            {
                "speaker": _find_speaker_for_time((s["start"] + s["end"])/2.0, diarization_segments),
                "start": s["start"],
                "end": s["end"],
                "text": s["text"],
            }
            for s in transcription_segments
        ]

    # Step 2 — Diarize (speaker segments without time drift)
    diarization_segments = diarize_audio(audio_path)
    logger.info("Diarization:   %d speaker segment(s)", len(diarization_segments))

    # Step 3 — Group words into fine-grained conversation turns
    conversation = _group_words_into_turns(words, diarization_segments)
    logger.info("Conversation:  %d turn(s) generated", len(conversation))

    return conversation
