from faster_whisper import WhisperModel
from typing import Dict, List

_model = None

def load_whisper_model() -> None:
    """Load model once when the server starts."""
    global _model
    if _model is not None:
        return
    _model = WhisperModel(
        "base",
        device="cpu",
        compute_type="int8"
    )

def get_model() -> WhisperModel:
    global _model
    if _model is None:
        load_whisper_model()
    return _model

def transcribe_audio(file_path: str) -> str:
    """Return the full transcript as a single string."""
    segments, info = get_model().transcribe(file_path)
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
    segments, info = get_model().transcribe(file_path)
    return [
        {
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        }
        for seg in segments
    ]