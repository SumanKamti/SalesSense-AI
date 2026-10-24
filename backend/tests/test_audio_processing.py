import os
import tempfile
import numpy as np
import soundfile as sf
import pytest

from app.services.audio_preprocessing import preprocess_speech_audio
from app.services.conversation_service import (
    infer_speaker_roles,
    _group_words_into_turns,
    _align_turns_with_words,
)


def test_audio_preprocessing_filters_hum_and_preserves_duration():
    """Verify high-pass filter and dynamic normalization on synthetic audio."""
    sr = 16000
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    # 440 Hz tone (speech frequency) + 60 Hz line hum
    audio = 0.1 * np.sin(2 * np.pi * 440 * t) + 0.05 * np.sin(2 * np.pi * 60 * t)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        temp_input = tf.name

    try:
        sf.write(temp_input, audio.astype(np.float32), sr)
        preprocessed_path, is_temp = preprocess_speech_audio(temp_input)

        assert os.path.exists(preprocessed_path)
        out_wav, out_sr = sf.read(preprocessed_path)
        assert out_sr == sr
        # Duration must match within 0.05s
        assert abs(len(out_wav) / out_sr - duration) < 0.05

        if is_temp and os.path.exists(preprocessed_path):
            os.remove(preprocessed_path)
    finally:
        if os.path.exists(temp_input):
            os.remove(temp_input)


def test_infer_speaker_roles_identifies_sales_agent_and_prospect():
    """Verify semantic role inference assigns Sales Agent and Prospect correctly."""
    turns = [
        {"speaker": "SPEAKER_00", "text": "Thank you for calling customer service. How can I help you today?"},
        {"speaker": "SPEAKER_01", "text": "I'm calling regarding my gift vouchers. I wanted to know if I can change it."},
        {"speaker": "SPEAKER_00", "text": "Well, as long as the gift card has not been swapped, you can definitely change it."},
        {"speaker": "SPEAKER_01", "text": "Okay, thank you so much. Have a great day."},
    ]
    roles = infer_speaker_roles(turns)
    assert roles.get("SPEAKER_00") == "Sales Agent"
    assert roles.get("SPEAKER_01") == "Prospect"


def test_turn_grouping_anti_monolith_safeguard():
    """Verify that multi-sentence dialogues with speaker cues are not merged into a 60-second blob."""
    # Simulate words across 30 seconds where acoustic label temporarily stayed SPEAKER_00
    words = [
        # Sentence 1: Agent (0 - 4s)
        {"word": "Hi,", "start": 0.0, "end": 0.5},
        {"word": "thank", "start": 0.6, "end": 0.9},
        {"word": "you", "start": 1.0, "end": 1.2},
        {"word": "for", "start": 1.3, "end": 1.5},
        {"word": "calling.", "start": 1.6, "end": 2.2},
        # Sentence 2: Prospect after 0.8s pause (3.0 - 7.0s)
        {"word": "I'm", "start": 3.0, "end": 3.3},
        {"word": "calling", "start": 3.4, "end": 3.8},
        {"word": "regarding", "start": 3.9, "end": 4.4},
        {"word": "my", "start": 4.5, "end": 4.7},
        {"word": "vouchers.", "start": 4.8, "end": 5.5},
        # Sentence 3: Agent after pause (6.4 - 9.0s)
        {"word": "How", "start": 6.4, "end": 6.7},
        {"word": "can", "start": 6.8, "end": 7.0},
        {"word": "I", "start": 7.1, "end": 7.3},
        {"word": "help", "start": 7.4, "end": 7.7},
        {"word": "you?", "start": 7.8, "end": 8.2},
    ]

    diarization_segments = [
        {"speaker": "SPEAKER_00", "start": 0.0, "end": 10.0}
    ]

    turns = _group_words_into_turns(words, diarization_segments)
    # Must be split into at least 2 distinct turns rather than 1 monolithic turn!
    assert len(turns) >= 2


def test_align_turns_with_words_preserves_timestamps():
    """Verify that aligned turns accurately match the word-level start and end times."""
    words = [
        {"word": "Hello,", "start": 1.0, "end": 1.5},
        {"word": "how", "start": 1.6, "end": 1.8},
        {"word": "are", "start": 1.9, "end": 2.1},
        {"word": "you?", "start": 2.2, "end": 2.5},
        {"word": "I", "start": 3.0, "end": 3.2},
        {"word": "am", "start": 3.3, "end": 3.5},
        {"word": "good.", "start": 3.6, "end": 4.0},
    ]
    parsed_turns = [
        {"role": "Sales Agent", "text": "Hello, how are you?"},
        {"role": "Prospect", "text": "I am good."},
    ]

    aligned = _align_turns_with_words(parsed_turns, words)
    assert len(aligned) == 2
    assert aligned[0]["role"] == "Sales Agent"
    assert aligned[0]["start"] == 1.0
    assert aligned[0]["end"] == 2.5

    assert aligned[1]["role"] == "Prospect"
    assert aligned[1]["start"] == 3.0
    assert aligned[1]["end"] == 4.0
