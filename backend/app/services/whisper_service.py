import logging
import os
from typing import Any, Dict, List, Optional
from faster_whisper import WhisperModel

from app.core.config import settings
from app.services.audio_preprocessing import preprocess_speech_audio

logger = logging.getLogger(__name__)

_model: Optional[WhisperModel] = None
_model_name: Optional[str] = None

_SALES_INITIAL_PROMPT = (
    "Customer service and sales phone conversation between a sales representative and a customer. "
    "Discussion includes account balance, order, subscription, refund, gift card, voucher, "
    "store swap, transfer, pricing, payment, and product support."
)


def load_whisper_model(model_name: Optional[str] = None) -> None:
    """Load Faster-Whisper model with automatic fallback to base if requested model unavailable."""
    global _model, _model_name

    target_name = model_name or getattr(settings, "WHISPER_MODEL", "small")
    compute_type = getattr(settings, "WHISPER_COMPUTE_TYPE", "int8")

    if _model is not None and _model_name == target_name:
        return

    logger.info("Attempting to load Faster-Whisper model (%s, cpu, %s)...", target_name, compute_type)
    try:
        _model = WhisperModel(
            target_name,
            device="cpu",
            compute_type=compute_type,
        )
        _model_name = target_name
        logger.info("Faster-Whisper model (%s) loaded successfully.", target_name)
    except Exception as exc:
        logger.warning(
            "Failed to load Faster-Whisper model '%s' (%s). Falling back to 'base'...",
            target_name, exc
        )
        try:
            _model = WhisperModel(
                "base",
                device="cpu",
                compute_type="int8",
            )
            _model_name = "base"
            logger.info("Faster-Whisper fallback model ('base') loaded successfully.")
        except Exception as fallback_exc:
            logger.critical("Failed to load fallback Whisper model: %s", fallback_exc)
            raise fallback_exc


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        load_whisper_model()
    return _model


def transcribe_audio(file_path: str) -> str:
    """Return the full transcript as a single string with audio enhancement."""
    model = get_model()
    audio_to_transcribe, is_temp = preprocess_speech_audio(file_path)

    try:
        segments, info = model.transcribe(
            audio_to_transcribe,
            beam_size=5,
            best_of=5,
            temperature=[0.0, 0.2],
            condition_on_previous_text=False,
            initial_prompt=_SALES_INITIAL_PROMPT,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=450, speech_pad_ms=350, threshold=0.25),
        )
        transcript = ""
        for segment in segments:
            transcript += segment.text + " "
        transcript = transcript.strip()

        # Fallback: if VAD dropped everything, retry without VAD
        if not transcript:
            logger.info("VAD filtered all audio; retrying without VAD filter...")
            segments, _ = model.transcribe(
                audio_to_transcribe,
                beam_size=5,
                condition_on_previous_text=False,
                vad_filter=False,
                initial_prompt=_SALES_INITIAL_PROMPT,
            )
            for segment in segments:
                transcript += segment.text + " "
            transcript = transcript.strip()

        return transcript
    finally:
        if is_temp and os.path.exists(audio_to_transcribe):
            try:
                os.remove(audio_to_transcribe)
            except OSError:
                pass


def transcribe_audio_words(file_path: str) -> List[Dict[str, Any]]:
    """Return word-level timestamped tokens from Whisper with enhanced precision."""
    model = get_model()
    audio_to_transcribe, is_temp = preprocess_speech_audio(file_path)

    try:
        segments, info = model.transcribe(
            audio_to_transcribe,
            beam_size=5,
            best_of=5,
            word_timestamps=True,
            temperature=[0.0, 0.2],
            condition_on_previous_text=False,
            initial_prompt=_SALES_INITIAL_PROMPT,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=450, speech_pad_ms=350, threshold=0.25),
        )
        words_list = []
        seg_list = list(segments)

        # Fallback if VAD was too aggressive on quiet audio
        if not seg_list:
            logger.info("VAD filtered all audio; retrying without VAD filter...")
            segments, _ = model.transcribe(
                audio_to_transcribe,
                beam_size=5,
                word_timestamps=True,
                condition_on_previous_text=False,
                vad_filter=False,
                initial_prompt=_SALES_INITIAL_PROMPT,
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
    finally:
        if is_temp and os.path.exists(audio_to_transcribe):
            try:
                os.remove(audio_to_transcribe)
            except OSError:
                pass


def transcribe_audio_segments(file_path: str) -> List[Dict[str, Any]]:
    """Return timestamped transcription segments and their words."""
    model = get_model()
    audio_to_transcribe, is_temp = preprocess_speech_audio(file_path)

    try:
        segments, info = model.transcribe(
            audio_to_transcribe,
            beam_size=5,
            best_of=5,
            word_timestamps=True,
            temperature=[0.0, 0.2],
            condition_on_previous_text=False,
            initial_prompt=_SALES_INITIAL_PROMPT,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=450, speech_pad_ms=350, threshold=0.25),
        )
        seg_list = list(segments)
        if not seg_list:
            segments, _ = model.transcribe(
                audio_to_transcribe,
                beam_size=5,
                word_timestamps=True,
                condition_on_previous_text=False,
                vad_filter=False,
                initial_prompt=_SALES_INITIAL_PROMPT,
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
    finally:
        if is_temp and os.path.exists(audio_to_transcribe):
            try:
                os.remove(audio_to_transcribe)
            except OSError:
                pass
