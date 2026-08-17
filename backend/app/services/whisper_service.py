import logging
from faster_whisper import WhisperModel
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

_model = None
_model_name = "base"  # "base" or "small"

def load_whisper_model(model_name: str = "base") -> None:
    """Load model once when the server starts."""
    global _model, _model_name
    if _model is not None and _model_name == model_name:
        return
    logger.info("Loading Faster-Whisper model (%s, cpu, int8)...", model_name)
    _model = WhisperModel(
        model_name,
        device="cpu",
        compute_type="int8"
    )
    _model_name = model_name
    logger.info("Faster-Whisper model (%s) loaded successfully.", model_name)

def get_model() -> WhisperModel:
    global _model
    if _model is None:
        load_whisper_model("base")
    return _model

def transcribe_audio(file_path: str) -> str:
    """Return the full transcript as a single string."""
    segments, info = get_model().transcribe(
        file_path,
        beam_size=5,
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400, threshold=0.35),
    )
    transcript = ""
    for segment in segments:
        transcript += segment.text + " "
    return transcript.strip()


def transcribe_audio_words(file_path: str) -> List[Dict[str, Any]]:
    """Return word-level and clause-level timestamped tokens from Whisper.

    Each word token contains:
    - ``start`` – start time in seconds
    - ``end``   – end time in seconds
    - ``word``  – word text with original spacing
    """
    segments, info = get_model().transcribe(
        file_path,
        beam_size=5,
        word_timestamps=True,
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400, threshold=0.35),
    )
    words_list = []
    for seg in segments:
        if seg.words:
            for w in seg.words:
                if w.word:
                    words_list.append({
                        "word": w.word,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                    })
        else:
            text = seg.text.strip()
            if text:
                words_list.append({
                    "word": " " + text,
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                })
    return words_list


def transcribe_audio_segments(file_path: str) -> List[Dict]:
    """Return timestamped transcription segments."""
    segments, info = get_model().transcribe(
        file_path,
        beam_size=5,
        word_timestamps=True,
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400, threshold=0.35),
    )
    results = []
    for seg in segments:
        text = seg.text.strip()
        if text:
            results.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": text,
            })
    return results