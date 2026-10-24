"""
Audio Preprocessing Service
===========================
Enhances speech clarity for telephone and VoIP calls prior to transcription
and speaker diarization:
1. High-pass filtering (85 Hz cutoff) to eliminate telephone DC offset, 50/60Hz line hum,
   and low-frequency mic rumble.
2. Dynamic range normalization & soft Automatic Gain Control (AGC) to boost faint,
   distant customer phone voices while preventing loud IVR/agent speech from clipping.
3. Strict duration preservation: timestamps remain 100% time-synchronized.
"""

import logging
import os
import tempfile
from typing import Tuple

import librosa
import numpy as np
import scipy.signal
import soundfile as sf

from app.core.config import settings

logger = logging.getLogger(__name__)


def preprocess_speech_audio(audio_path: str) -> Tuple[str, bool]:
    """Preprocess audio file for enhanced speech recognition and diarization.

    Args:
        audio_path: Path to the input audio file.

    Returns:
        Tuple of (output_file_path, is_temporary_file).
        If preprocessing is disabled or fails, returns (audio_path, False).
    """
    if not getattr(settings, "AUDIO_PREPROCESSING_ENABLED", True):
        return audio_path, False

    try:
        # Load audio as mono 16 kHz float32
        wav, sr = librosa.load(audio_path, sr=16000, mono=True)
        if len(wav) == 0:
            return audio_path, False

        # 1. High-pass filter (Butterworth 2nd order, 85 Hz cutoff)
        # Removes phone DC bias and low-frequency rumble
        sos = scipy.signal.butter(2, 85.0, btype="highpass", fs=sr, output="sos")
        filtered_wav = scipy.signal.sosfilt(sos, wav)

        # 2. Dynamic Range Compression / Soft AGC for telephone audio
        # Boost faint caller audio while keeping peaks controlled
        frame_len = int(0.1 * sr)
        rms = librosa.feature.rms(y=filtered_wav, frame_length=frame_len, hop_length=frame_len // 2)[0]

        # Determine voice threshold (speech frames only)
        speech_frames = rms[rms > 0.003]
        if len(speech_frames) > 0:
            median_speech_rms = float(np.median(speech_frames))
            target_rms = 0.08  # ~ -22 dBFS

            # Moderate gain (between 0.8x and 3.5x)
            if median_speech_rms > 0:
                gain = float(np.clip(target_rms / (median_speech_rms + 1e-6), 0.8, 3.5))
                filtered_wav = filtered_wav * gain

        # Soft peak limiter to avoid hard clipping
        max_val = float(np.max(np.abs(filtered_wav)))
        if max_val > 0.95:
            filtered_wav = np.tanh(filtered_wav / max_val * 1.2) * 0.95

        # 3. Export to a clean temporary WAV file (16 kHz mono 16-bit PCM)
        temp_dir = tempfile.gettempdir()
        fd, temp_path = tempfile.mkstemp(prefix="preproc_", suffix=".wav", dir=temp_dir)
        os.close(fd)

        sf.write(temp_path, filtered_wav, sr, subtype="PCM_16")
        logger.info(
            "Audio preprocessed successfully: %s -> %s (%.1fs)",
            audio_path, temp_path, len(filtered_wav) / sr
        )
        return temp_path, True

    except Exception as exc:
        logger.warning(
            "Audio preprocessing failed for '%s'; using original audio: %s",
            audio_path, exc
        )
        return audio_path, False
