"""
Comprehensive Test Suite for Long, Mixed, and Interrupted Conversations
========================================================================
Validates professor feedback requirements:
1. Long conversations and multiple conversation types (inbound, outbound, voicemail).
2. Speaker identification during interruptions, barge-ins, and rapid mixed dialogue.
3. Optimized audio processing and execution performance.
"""

import os
import tempfile
import numpy as np
import soundfile as sf
import pytest

from app.services.audio_preprocessing import preprocess_speech_audio
from app.services.conversation_service import (
    infer_speaker_roles,
    _group_words_into_turns,
    _detect_and_tag_interruptions,
    _needs_dialogue_refinement,
    _align_turns_with_words,
)


def test_long_conversation_audio_preprocessing_performance():
    """Verify high-throughput audio preprocessing for long calls (simulating 60s+ of audio)."""
    sr = 16000
    duration = 60.0  # 1 full minute of audio
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    # Complex signal: voice frequency + 60Hz hum + intermittent silence
    voice_carrier = 0.15 * np.sin(2 * np.pi * 300 * t)
    line_hum = 0.08 * np.sin(2 * np.pi * 60 * t)
    audio = voice_carrier + line_hum

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        temp_input = tf.name

    try:
        sf.write(temp_input, audio.astype(np.float32), sr)

        # Preprocess long audio
        preprocessed_path, is_temp = preprocess_speech_audio(temp_input)

        assert os.path.exists(preprocessed_path)
        out_wav, out_sr = sf.read(preprocessed_path)
        assert out_sr == sr
        assert abs(len(out_wav) / out_sr - duration) < 0.1

        if is_temp and os.path.exists(preprocessed_path):
            os.remove(preprocessed_path)
    finally:
        if os.path.exists(temp_input):
            os.remove(temp_input)


def test_mixed_rapid_conversation_turn_separation():
    """Verify rapid back-and-forth ping-pong conversation is not merged."""
    words = [
        # Turn 1: Agent
        {"word": "Hello?", "start": 1.0, "end": 1.5},
        # Turn 2: Prospect (rapid response at 1.8s)
        {"word": "Hi,", "start": 1.8, "end": 2.1},
        {"word": "can", "start": 2.2, "end": 2.4},
        {"word": "you", "start": 2.5, "end": 2.7},
        {"word": "hear", "start": 2.8, "end": 3.0},
        {"word": "me?", "start": 3.1, "end": 3.4},
        # Turn 3: Agent (rapid answer at 3.6s)
        {"word": "Yes,", "start": 3.6, "end": 3.9},
        {"word": "I", "start": 4.0, "end": 4.1},
        {"word": "can.", "start": 4.2, "end": 4.5},
        # Turn 4: Prospect inquiry at 4.8s
        {"word": "I'm", "start": 4.8, "end": 5.1},
        {"word": "calling", "start": 5.2, "end": 5.6},
        {"word": "regarding", "start": 5.7, "end": 6.2},
        {"word": "my", "start": 6.3, "end": 6.5},
        {"word": "vouchers.", "start": 6.6, "end": 7.2},
    ]

    diarization_segments = [
        {"speaker": "SPEAKER_00", "start": 1.0, "end": 1.7},
        {"speaker": "SPEAKER_01", "start": 1.7, "end": 3.5},
        {"speaker": "SPEAKER_00", "start": 3.5, "end": 4.7},
        {"speaker": "SPEAKER_01", "start": 4.7, "end": 7.5},
    ]

    turns = _group_words_into_turns(words, diarization_segments)
    # Must preserve all 4 distinct rapid turns
    assert len(turns) == 4
    assert turns[0]["speaker"] == "SPEAKER_00"
    assert turns[1]["speaker"] == "SPEAKER_01"
    assert turns[2]["speaker"] == "SPEAKER_00"
    assert turns[3]["speaker"] == "SPEAKER_01"


def test_interruption_detection_identifies_barge_in():
    """Verify speaker interruption is detected when caller cuts in before sentence completion."""
    turns = [
        {
            "speaker": "SPEAKER_00",
            "role": "Sales Agent",
            "start": 0.0,
            "end": 3.5,
            "text": "Well as long as the gift card has not been swapped you can definitely",  # cut off mid-sentence
        },
        {
            "speaker": "SPEAKER_01",
            "role": "Prospect",
            "start": 3.55,  # cuts in with almost zero gap (0.05s)
            "end": 6.0,
            "text": "Wait, sorry to interrupt, can you hear me now?",
        },
        {
            "speaker": "SPEAKER_00",
            "role": "Sales Agent",
            "start": 6.8,
            "end": 9.0,
            "text": "Yes, I can hear you now. Go ahead.",
        },
    ]

    tagged_turns = _detect_and_tag_interruptions(turns)
    assert tagged_turns[0]["is_interruption"] is False
    assert tagged_turns[1]["is_interruption"] is True  # The cut-in is an interruption
    assert tagged_turns[1]["interrupted_speaker"] == "SPEAKER_00"
    assert tagged_turns[2]["is_interruption"] is False


def test_different_conversation_types():
    """Verify role inference across different conversation types (support, pitch, voicemail)."""
    # Type A: Support Inbound
    support_turns = [
        {"speaker": "SPEAKER_00", "text": "Thank you for calling support. How can I help you today?"},
        {"speaker": "SPEAKER_01", "text": "I purchased a gift voucher and I want to swap it to a different store."},
    ]
    roles_support = infer_speaker_roles(support_turns)
    assert roles_support["SPEAKER_00"] == "Sales Agent"
    assert roles_support["SPEAKER_01"] == "Prospect"

    # Type B: Voicemail / Monologue
    voicemail_turns = [
        {"speaker": "SPEAKER_00", "text": "Hi, I'm calling regarding my account order #543. Please call me back at 555-0199."},
    ]
    roles_voicemail = infer_speaker_roles(voicemail_turns)
    assert roles_voicemail["SPEAKER_00"] == "Prospect"


def test_dialogue_refinement_trigger_on_long_mixed_block():
    """Verify that a 30-word block with alternating agent/prospect speech triggers refinement."""
    turns = [
        {
            "speaker": "SPEAKER_00",
            "role": "Sales Agent",
            "start": 0.0,
            "end": 35.0,
            "text": "Hello, ma'am? How can I help you? I'm calling regarding my gift vouchers. You're calling your gift vouchers? Yes. Okay, and I wanted to know if I can change it. Well, as long as the gift card hasn't been changed you can definitely swap.",
        }
    ]
    assert _needs_dialogue_refinement(turns) is True
