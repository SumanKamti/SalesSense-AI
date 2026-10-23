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
    model = get_model()
    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        condition_on_previous_text=False,
        initial_prompt="A conversation between a sales representative and a customer.",
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=400, threshold=0.20),
    )
    transcript = ""
    for segment in segments:
        transcript += segment.text + " "
    transcript = transcript.strip()

    # Fallback: if VAD dropped everything or yielded almost nothing, retry without VAD
    if not transcript:
        segments, _ = model.transcribe(
            file_path,
            beam_size=5,
            condition_on_previous_text=False,
            vad_filter=False,
        )
        for segment in segments:
            transcript += segment.text + " "
        transcript = transcript.strip()

    return transcript


def transcribe_audio_words(file_path: str) -> List[Dict[str, Any]]:
    """Return word-level timestamped tokens from Whisper without clipping words."""
    model = get_model()
    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        word_timestamps=True,
        condition_on_previous_text=False,
        initial_prompt="A conversation between a sales representative and a customer.",
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=400, threshold=0.20),
    )
    words_list = []
    seg_list = list(segments)

    # Fallback if VAD was too aggressive on quiet audio
    if not seg_list:
        logger.info("VAD filtered all audio; retrying without VAD filter...")
        segments, _ = model.transcribe(
            file_path,
            beam_size=5,
            word_timestamps=True,
            condition_on_previous_text=False,
            vad_filter=False,
        )
        seg_list = list(segments)

    for seg in seg_list:
        if seg.words:
            for w in seg.words:
                if w.word:
                    words_list.append({
                        "word": w.word,
                        "start": round(float(w.start), 2),
                        "end": round(float(w.end), 2),
                    })
        else:
            text = seg.text.strip()
            if text:
                words_list.append({
                    "word": " " + text,
                    "start": round(float(seg.start), 2),
                    "end": round(float(seg.end), 2),
                })
    return words_list


def transcribe_audio_segments(file_path: str) -> List[Dict]:
    """Return timestamped transcription segments and their words."""
    model = get_model()
    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        word_timestamps=True,
        condition_on_previous_text=False,
        initial_prompt="A conversation between a sales representative and a customer.",
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=400, threshold=0.20),
    )
    seg_list = list(segments)
    if not seg_list:
        segments, _ = model.transcribe(
            file_path,
            beam_size=5,
            word_timestamps=True,
            condition_on_previous_text=False,
            vad_filter=False,
        )
        seg_list = list(segments)

    results = []
    for seg in seg_list:
        text = seg.text.strip()
        if text:
            word_items = []
            if seg.words:
                for w in seg.words:
                    if w.word:
                        word_items.append({
                            "word": w.word,
                            "start": round(float(w.start), 2),
                            "end": round(float(w.end), 2),
                        })
            results.append({
                "start": round(float(seg.start), 2),
                "end": round(float(seg.end), 2),
                "text": text,
                "words": word_items,
            })
    return results