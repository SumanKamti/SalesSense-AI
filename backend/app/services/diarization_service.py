"""
Speaker Diarization Service
===========================
Uses pyannote.audio to identify *who spoke when* in an audio file.

The pipeline is loaded **once** at application startup via `load_pipeline()`
and reused for every request.
"""

import logging
from typing import Any, Dict, List

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class PipelineNotLoadedError(Exception):
    """The diarization pipeline is not available."""


class DiarizationError(Exception):
    """An error occurred while processing the audio file."""


# ---------------------------------------------------------------------------
# Pipeline singleton
# ---------------------------------------------------------------------------

_pipeline = None


def load_pipeline() -> None:
    """Initialise the pyannote diarization pipeline.

    Call this **once** during application startup (e.g. in a FastAPI lifespan).
    Subsequent calls are a no-op if the pipeline is already loaded.

    Raises:
        PipelineNotLoadedError: If the pipeline cannot be loaded (bad token,
            network issue, missing model access, …).
    """
    global _pipeline

    if _pipeline is not None:
        logger.info("Diarization pipeline already loaded — skipping.")
        return

    if not settings.HUGGINGFACE_TOKEN:
        raise PipelineNotLoadedError(
            "HUGGINGFACE_TOKEN is not set in .env. "
            "The diarization pipeline requires a valid Hugging Face token."
        )

    try:
        from pyannote.audio import Pipeline

        logger.info(
            "Loading diarization pipeline: %s …", settings.DIARIZATION_MODEL
        )
        _pipeline = Pipeline.from_pretrained(
            settings.DIARIZATION_MODEL,
            token=settings.HUGGINGFACE_TOKEN,
        )
        logger.info("Diarization pipeline loaded successfully.")

    except Exception as exc:
        logger.exception("Failed to load the diarization pipeline.")
        raise PipelineNotLoadedError(
            f"Could not load model '{settings.DIARIZATION_MODEL}'. "
            "Verify your Hugging Face token and that you have accepted "
            "the model's licence on huggingface.co."
        ) from exc


def get_pipeline() -> Any:
    """Return the loaded pipeline instance.

    Raises:
        PipelineNotLoadedError: If `load_pipeline()` was never called or failed.
    """
    if _pipeline is None:
        raise PipelineNotLoadedError(
            "Diarization pipeline is not loaded. "
            "Ensure load_pipeline() was called at application startup."
        )
    return _pipeline


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def diarize_audio(audio_path: str) -> List[Dict[str, Any]]:
    """Run speaker diarization on an audio file.

    Args:
        audio_path: Path to the audio file on disk.

    Returns:
        A list of speaker segments, each containing:
        - ``speaker``  – label assigned by the model (e.g. ``SPEAKER_00``)
        - ``start``    – segment start time in seconds
        - ``end``      – segment end time in seconds

    Raises:
        PipelineNotLoadedError: If the pipeline is unavailable.
        DiarizationError: If processing the audio file fails.
    """
    import librosa
    import torch

    pipeline = get_pipeline()

    try:
        logger.info("Starting diarization for: %s", audio_path)

        # Load audio with librosa (avoids torchcodec requirement)
        waveform, sample_rate = librosa.load(audio_path, sr=None)
        waveform_tensor = torch.tensor(
            waveform, dtype=torch.float32
        ).unsqueeze(0)

        audio_input = {
            "waveform": waveform_tensor,
            "sample_rate": sample_rate,
        }

        logger.info("Running diarization model (this may take a few minutes)...")
        diarization_output = pipeline(audio_input)
        
        # Pyannote 3.1 returns a DiarizeOutput object, the actual annotation is in speaker_diarization
        if hasattr(diarization_output, 'speaker_diarization'):
            annotation = diarization_output.speaker_diarization
        else:
            annotation = diarization_output

        segments: List[Dict[str, Any]] = [
            {
                "speaker": speaker,
                "start": round(turn.start, 2),
                "end": round(turn.end, 2),
            }
            for turn, _, speaker in annotation.itertracks(yield_label=True)
        ]

        logger.info("Diarization complete — %d segment(s) found.", len(segments))
        return segments

    except PipelineNotLoadedError:
        raise
    except Exception as exc:
        logger.exception("Diarization failed for: %s", audio_path)
        raise DiarizationError(
            f"Failed to diarize audio file '{audio_path}': {exc}"
        ) from exc