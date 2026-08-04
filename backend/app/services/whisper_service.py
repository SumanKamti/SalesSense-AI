from faster_whisper import WhisperModel
from typing import Dict, List

# Load model once when the server starts
model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)


def transcribe_audio(file_path: str) -> str:
    """Return the full transcript as a single string."""
    segments, info = model.transcribe(file_path)
    transcript = ""
    for segment in segments:
        transcript += segment.text + " "
    return transcript.strip()


def transcribe_audio_segments(file_path: str) -> List[Dict]:
    """Return timestamped transcription segments.

    Each segment contains:
    - ``start`` – start time in seconds
    - ``end``   – end time in seconds
    - ``text``  – transcribed text for this segment
    """
    segments, info = model.transcribe(file_path)
    return [
        {
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        }
        for seg in segments
    ]