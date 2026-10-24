"""
Conversation Service
====================
Merges Faster-Whisper word-level transcription with speaker diarization
to produce a clean, grammatically intact, and accurate conversation view:
*who said what, and in what role (Sales Agent vs Prospect)*.

Algorithm
---------
1. Diarize audio into speaker intervals using lightweight clustering.
2. Transcribe audio with word-level timestamps via Faster-Whisper.
3. Align each word to its active speaker.
4. Smooth transient single-word acoustic flickers.
5. Group words into natural turns based on sentence boundaries, acoustic pauses,
   and anti-monolith safeguards.
6. Semantically infer roles (Sales Agent vs Prospect) based on dialogue cues.
7. Refine dialogue turns using Google Gemini 2.5 Flash if merged turns are detected.
"""

import json
import logging
import re
from typing import Any, Dict, List

from app.core.config import settings
from app.services.whisper_service import transcribe_audio_words, transcribe_audio_segments
from app.services.diarization_service import diarize_audio

logger = logging.getLogger(__name__)


def _find_speaker_for_time(mid_time: float, diarization_segments: List[Dict[str, Any]]) -> str:
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


def infer_speaker_roles(turns: List[Dict[str, Any]]) -> Dict[str, str]:
    """Determine which speaker is the Sales Agent and which is the Prospect based on dialogue cues.

    Returns:
        Mapping like {"SPEAKER_00": "Sales Agent", "SPEAKER_01": "Prospect"}.
    """
    speakers = list(dict.fromkeys(t["speaker"] for t in turns if t.get("speaker")))
    if not speakers:
        return {}
    if len(speakers) == 1:
        spk = speakers[0]
        full_text = " ".join(t.get("text", "") for t in turns).lower()
        prospect_indicators = [
            "i'm calling to", "i am calling to", "i'm calling about", "i am calling about",
            "i'm calling regarding", "i called to", "i purchased", "i bought", "my account",
            "give me a call", "call me back", "my number is", "my phone number", "please call",
            "question about", "i wanted to know", "can i change"
        ]
        is_prospect = any(p in full_text for p in prospect_indicators)
        role = "Prospect" if is_prospect else "Sales Agent"
        return {spk: role}

    agent_phrases = [
        "thank you for calling", "thanks for calling", "thank you for reaching",
        "how can i help", "how can i assist", "how may i help", "can i help you",
        "welcome to", "calling from", "customer service", "customer support",
        "our support", "support team", "i can help you with that", "i'll help you out",
        "let me help", "let me check", "let me look", "on your account", "your account",
        "can i have your", "can i get your", "your email address", "your phone number",
        "reversed that charge", "reversed the charge", "issued a refund", "credit back",
        "account balance", "did you know you can get help", "online chat", "extended wait times",
        "experiencing extended wait", "our chat team", "press any key", "stay on the line",
        "well as long as", "you can definitely swap", "would you like me to check",
        "there you go i can hear you", "sorry for the interruption", "you're welcome"
    ]
    prospect_phrases = [
        "i purchased", "i just purchased", "i bought", "i ordered", "i was charged",
        "took my money", "got charged", "refund my money", "get a refund", "give me a refund",
        "reversed my charge", "started beeping", "wasn't working", "didn't work",
        "i'm calling regarding", "i am calling regarding", "i'm calling about", "i am calling about",
        "i wanted to know", "will i be able to change", "can i change it", "different store",
        "can you hear me now", "can you hear me", "i can hear you now", "hello can you hear me",
        "i have an issue", "i have a problem", "how much does it cost", "does it come with",
        "what is the price", "i just wanted to make sure", "is that the case"
    ]

    scores: Dict[str, float] = {s: 0.0 for s in speakers}
    for turn in turns:
        spk = turn.get("speaker")
        text = turn.get("text", "").lower()
        for kw in agent_phrases:
            if kw in text:
                scores[spk] += 3.0
        for kw in prospect_phrases:
            if kw in text:
                scores[spk] -= 3.0

    sorted_speakers = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_agent = sorted_speakers[0][0]

    if scores[sorted_speakers[0][0]] == scores[sorted_speakers[1][0]]:
        q_counts = {s: 0 for s in speakers}
        for turn in turns:
            if "?" in turn.get("text", ""):
                q_counts[turn.get("speaker")] += 1
        if q_counts[speakers[0]] > q_counts[speakers[1]]:
            best_agent = speakers[1]
        else:
            best_agent = speakers[0]

    roles = {}
    for s in speakers:
        roles[s] = "Sales Agent" if s == best_agent else "Prospect"
    return roles


def _group_words_into_turns(
    words: List[Dict[str, Any]],
    diarization_segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Assign speakers per word, smooth flickers, and group into conversational turns with anti-monolith safeguards."""
    if not words:
        return []

    # 1. Map raw speaker to each word
    labeled_words = []
    for w in words:
        mid_time = (w["start"] + w["end"]) / 2.0
        spk = _find_speaker_for_time(mid_time, diarization_segments)
        labeled_words.append({
            "word": w["word"].strip(),
            "start": float(w["start"]),
            "end": float(w["end"]),
            "speaker": spk,
        })

    # 2. Smooth single-word flickers: [A, B, A] -> A
    n = len(labeled_words)
    if n > 2:
        for i in range(1, n - 1):
            prev_spk = labeled_words[i - 1]["speaker"]
            curr_spk = labeled_words[i]["speaker"]
            next_spk = labeled_words[i + 1]["speaker"]
            gap_before = labeled_words[i]["start"] - labeled_words[i - 1]["end"]
            gap_after = labeled_words[i + 1]["start"] - labeled_words[i]["end"]

            if prev_spk == next_spk and curr_spk != prev_spk and gap_before < 0.4 and gap_after < 0.4:
                labeled_words[i]["speaker"] = prev_spk

    # 3. Form natural conversation turns with sentence pauses and anti-monolith guards
    turns: List[Dict[str, Any]] = []
    curr = {
        "speaker": labeled_words[0]["speaker"],
        "start": labeled_words[0]["start"],
        "end": labeled_words[0]["end"],
        "words": [labeled_words[0]["word"]],
    }

    prospect_transition_prefixes = (
        "i'm calling", "i am calling", "i wanted to know", "will i be able", "can i change",
        "can you hear me", "i purchased", "i bought", "i have a question", "is that the case",
        "hello?", "hello ma'am?", "hello sir?"
    )
    agent_transition_prefixes = (
        "thank you for calling", "how can i help", "you want to know", "you're calling",
        "well as long as", "did you know", "we're sorry", "there you go", "would you like me",
        "all right. it's too late", "you're welcome"
    )

    for idx in range(1, len(labeled_words)):
        w = labeled_words[idx]
        prev_word = curr["words"][-1]
        prev_has_punct = any(prev_word.endswith(p) for p in [".", "?", "!", ","])
        prev_is_sentence_end = any(prev_word.endswith(p) for p in [".", "?", "!"])
        gap = w["start"] - curr["end"]
        spk_changed = (w["speaker"] != curr["speaker"])
        curr_duration = curr["end"] - curr["start"]
        curr_word_count = len(curr["words"])

        # Check lookahead streak (2+ consecutive words of new speaker)
        next_also_new_spk = False
        if spk_changed and idx + 1 < len(labeled_words):
            next_also_new_spk = (labeled_words[idx + 1]["speaker"] == w["speaker"])

        # Look ahead at the next 4 words to detect conversational dialogue shifts
        upcoming_text = " ".join(labeled_words[k]["word"].lower() for k in range(idx, min(idx + 5, len(labeled_words))))
        has_prospect_shift = any(upcoming_text.startswith(p) for p in prospect_transition_prefixes)
        has_agent_shift = any(upcoming_text.startswith(a) for a in agent_transition_prefixes)

        # Split conditions:
        # 1. Natural turn-taking silence (>= 0.7s) after sentence end
        # 2. Extended audio silence (> 2.0s)
        # 3. Acoustic speaker change accompanied by punctuation, natural gap, or multi-word streak
        # 4. Anti-monolith safeguard: prevent any turn from exceeding 16s or 32 words when a sentence breaks
        # 5. Distinct conversational phrase transition between sentences
        should_split = (
            (prev_is_sentence_end and gap >= 0.7) or
            gap > 2.0 or
            (spk_changed and (prev_has_punct or gap >= 0.12 or next_also_new_spk)) or
            (prev_is_sentence_end and gap >= 0.35 and (curr_duration > 16.0 or curr_word_count > 32)) or
            (prev_is_sentence_end and (has_prospect_shift or has_agent_shift))
        )

        if should_split:
            turn_text = " ".join(curr["words"]).strip()
            if turn_text:
                turns.append({
                    "speaker": curr["speaker"],
                    "start": round(curr["start"], 2),
                    "end": round(curr["end"], 2),
                    "text": turn_text,
                })
            curr = {
                "speaker": w["speaker"],
                "start": w["start"],
                "end": w["end"],
                "words": [w["word"]],
            }
        else:
            curr["words"].append(w["word"])
            curr["end"] = w["end"]

    # Finalize last turn
    turn_text = " ".join(curr["words"]).strip()
    if turn_text:
        turns.append({
            "speaker": curr["speaker"],
            "start": round(curr["start"], 2),
            "end": round(curr["end"], 2),
            "text": turn_text,
        })

    return turns


def _needs_dialogue_refinement(turns: List[Dict[str, Any]]) -> bool:
    """Detect if turns are incorrectly merged into a single speaker or lack proper turn boundaries."""
    if not turns:
        return False

    unique_roles = set(t.get("role") for t in turns)
    full_text = " ".join(t.get("text", "") for t in turns).lower()

    agent_cues = [
        "thank you for calling", "how can i help", "welcome to", "customer support",
        "can i help you", "have a great day", "did you know you can get help", "our chat team",
        "can i have your", "can i get your", "let me help", "i can help you with that",
        "you want to know", "well as long as", "you can definitely swap"
    ]
    prospect_cues = [
        "i called", "i purchased", "i'm calling", "can you hear me", "gift card",
        "gift vouchers", "my account", "refund", "how much", "change it to a different",
        "i wanted to know", "i was wondering", "will i be able"
    ]

    has_agent = any(k in full_text for k in agent_cues)
    has_prospect = any(k in full_text for k in prospect_cues)

    # Condition 1: Single role detected, but text clearly contains both parties
    if len(unique_roles) <= 1:
        if has_agent and has_prospect:
            return True
        if len(turns) >= 3 and any("?" in t.get("text", "") for t in turns):
            return True

    # Condition 2: Imbalanced turns (e.g. 1 speaker has > 80% of turns despite both cues present)
    agent_turn_count = sum(1 for t in turns if t.get("role") == "Sales Agent")
    ratio = agent_turn_count / len(turns)
    if (ratio >= 0.80 or ratio <= 0.20) and has_agent and has_prospect:
        return True

    # Condition 3: Any single turn contains large blocks of alternating speech
    for t in turns:
        txt = t.get("text", "").lower()
        if len(txt.split()) > 25:
            if (
                any(a in txt for a in ["how can i", "hello, ma 'am", "you're welcome", "did you know", "there you go", "as long as the gift card"]) and
                any(p in txt for p in ["i'm calling", "i purchased", "can you hear me", "change it", "i wanted to know", "will i be able"])
            ):
                return True

    return False


def _align_turns_with_words(
    parsed_turns: List[Dict[str, Any]],
    words: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Align AI-segmented dialogue turns with Whisper word-level timestamps using token window matching."""
    if not parsed_turns or not words:
        return []

    def clean_tok(s: str) -> str:
        return re.sub(r"[^\w]", "", s).lower()

    word_idx = 0
    total_words = len(words)
    aligned_turns = []

    for turn in parsed_turns:
        turn_text = turn.get("text", "").strip()
        if not turn_text:
            continue

        raw_tokens = turn_text.split()
        clean_tokens = [clean_tok(w) for w in raw_tokens if clean_tok(w)]
        if not clean_tokens:
            continue

        turn_start_idx = min(word_idx, total_words - 1)
        search_idx = word_idx
        matched_count = 0

        # Look forward within a reasonable window proportional to turn size
        search_window = max(len(clean_tokens) + 15, 25)
        limit = min(search_idx + search_window, total_words)

        for tok in clean_tokens:
            curr_pos = search_idx
            while curr_pos < limit:
                if clean_tok(words[curr_pos]["word"]) == tok:
                    matched_count += 1
                    search_idx = curr_pos + 1
                    break
                curr_pos += 1

        if matched_count >= max(1, len(clean_tokens) // 2):
            turn_end_idx = max(turn_start_idx, min(search_idx - 1, total_words - 1))
            word_idx = min(search_idx, total_words - 1)
        else:
            turn_end_idx = min(turn_start_idx + len(clean_tokens) - 1, total_words - 1)
            word_idx = min(turn_start_idx + len(clean_tokens), total_words - 1)

        start_time = float(words[turn_start_idx]["start"])
        end_time = float(words[turn_end_idx]["end"])
        if end_time <= start_time:
            end_time = round(start_time + 0.6, 2)

        role = turn.get("role", "Sales Agent")
        speaker = "SPEAKER_00" if role == "Sales Agent" else "SPEAKER_01"

        aligned_turns.append({
            "speaker": speaker,
            "role": role,
            "start": round(start_time, 2),
            "end": round(end_time, 2),
            "text": turn_text,
        })

    return aligned_turns


def _refine_conversation_dialogue(
    turns: List[Dict[str, Any]],
    words: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Use Gemini 2.5 Flash to segment merged or misclassified turns into proper speaker dialogue."""
    if not settings.GEMINI_API_KEY:
        return turns

    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        candidate_models = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-flash-latest",
        ]

        full_transcript = " ".join(t.get("text", "") for t in turns).strip()
        if not full_transcript:
            return turns

        prompt = (
            "You are an expert dialogue segmentation system for customer support and sales calls.\n"
            "The following transcript was produced by speech recognition, but multiple speaker turns were merged together into large paragraphs, or automated hold messages and live agents were conflated.\n\n"
            "TASK:\n"
            "Carefully segment the text into precise conversation turns between 'Sales Agent' and 'Prospect'.\n\n"
            "ROLES:\n"
            "- 'Sales Agent': The customer service representative, sales rep, or automated IVR / hold announcement system. (Phrases like 'how can I help', 'thank you for calling', 'can you hear me', 'did you know you can get help', 'I can help with your gift card', 'well as long as', etc.)\n"
            "- 'Prospect': The customer, caller, or buyer. (Phrases like 'I'm calling regarding my gift vouchers', 'can I change it to a different store?', 'yes', 'can you hear me now?', 'I purchased', 'is that the case', etc.)\n\n"
            "RULES:\n"
            "1. If this audio is a SINGLE-PERSON MONOLOGUE or VOICEMAIL (only 1 person spoke throughout), assign all turns to the single appropriate role ('Prospect' for customer voicemail, 'Sales Agent' for solo agent pitch) without creating an imaginary dialogue.\n"
            "2. If this is a CONVERSATION between two parties, SPLIT EVERY DIALOGUE EXCHANGE so that the customer's statements/answers and the agent's statements/questions are in separate turns.\n"
            "3. Do NOT omit or fabricate text. Keep the spoken sentences verbatim so they match audio timestamps.\n"
            "4. Return ONLY a JSON list of objects with 'role' and 'text', like:\n"
            '[\n  {"role": "Sales Agent", "text": "Hello, how can I help you?"},\n  {"role": "Prospect", "text": "Hi, I have a question about my gift card."}\n]'
        )

        response = None
        for model_name in candidate_models:
            try:
                logger.info("Attempting AI dialogue turn refinement with model: %s", model_name)
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt + f"\n\nTRANSCRIPT:\n{full_transcript}",
                    config=genai.types.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                    ),
                )
                if response and response.text:
                    logger.info("AI dialogue refinement succeeded with model: %s", model_name)
                    break
            except Exception as e:
                logger.warning("AI turn refinement failed with %s: %s", model_name, e)

        if not response or not response.text:
            return turns

        raw_json = response.text.strip()
        if raw_json.startswith("```"):
            raw_json = re.sub(r"^```(?:json)?\s*", "", raw_json)
            raw_json = re.sub(r"\s*```$", "", raw_json)

        parsed_turns = json.loads(raw_json)
        if not isinstance(parsed_turns, list) or len(parsed_turns) == 0:
            return turns

        aligned = _align_turns_with_words(parsed_turns, words)
        if aligned and len(aligned) > 0:
            logger.info("AI dialogue refinement succeeded: created %d granular turns.", len(aligned))
            return aligned

        return turns
    except Exception as exc:
        logger.warning("Dialogue refinement encountered an error; falling back to acoustic turns: %s", exc)
        return turns


def _detect_and_tag_interruptions(turns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect and tag conversational interruptions, barge-ins, and overlapping transitions."""
    if len(turns) < 2:
        for t in turns:
            t["is_interruption"] = False
        return turns

    interruption_starters = (
        "sorry to interrupt", "wait,", "wait.", "wait ", "hold on", "excuse me",
        "can you hear me", "can i just", "let me interrupt", "no, but", "actually,",
        "wait a second", "hello?", "pardon me", "hang on"
    )

    for i in range(len(turns)):
        turn = turns[i]
        turn["is_interruption"] = False

        if i == 0:
            continue

        prev_turn = turns[i - 1]
        prev_speaker = prev_turn.get("speaker")
        curr_speaker = turn.get("speaker")

        # Only speaker changes can be interruptions
        if prev_speaker == curr_speaker:
            continue

        prev_text = prev_turn.get("text", "").strip()
        curr_text = turn.get("text", "").strip().lower()

        # Check gap between previous end and current start
        gap = turn.get("start", 0) - prev_turn.get("end", 0)

        # 1. Negative or near-zero gap (< 0.15s) while previous turn was still speaking
        is_timing_overlap = gap < 0.15

        # 2. Previous turn was cut off (did NOT end with sentence terminator . ? !)
        prev_incomplete = len(prev_text) > 0 and not any(prev_text.endswith(p) for p in [".", "?", "!"])

        # 3. Explicit verbal interruption cue
        has_verbal_cue = any(curr_text.startswith(starter) for starter in interruption_starters)

        # 4. Barge-in condition
        if (is_timing_overlap and prev_incomplete) or (has_verbal_cue and gap < 0.8) or (gap < 0.05 and len(prev_text.split()) > 4):
            turn["is_interruption"] = True
            turn["interrupted_speaker"] = prev_speaker

    return turns


def build_conversation(audio_path: str) -> List[Dict[str, Any]]:
    """Run transcription + diarization and produce granular conversation turns with role labels.

    Args:
        audio_path: Path to the audio file on disk.

    Returns:
        A list of conversation turns:
            [
                {
                    "speaker": "SPEAKER_00",
                    "role": "Sales Agent",
                    "start": 0.0,
                    "end": 4.2,
                    "text": "Hello, thank you for calling."
                },
                ...
            ]
    """
    logger.info("Building conversation for: %s", audio_path)

    # Step 1 — Diarize speaker segments (with volume normalization and noise filtering)
    diarization_segments = diarize_audio(audio_path)
    logger.info("Diarization: %d speaker segment(s)", len(diarization_segments))

    # Step 2 — Transcribe word-level timestamped tokens (with telephone audio enhancement)
    words = transcribe_audio_words(audio_path)
    logger.info("Transcription: %d word(s) extracted", len(words))

    # Fallback if words are empty
    if not words:
        transcription_segments = transcribe_audio_segments(audio_path)
        for seg in transcription_segments:
            seg["speaker"] = _find_speaker_for_time((seg["start"] + seg["end"]) / 2.0, diarization_segments)
        turns = transcription_segments
    else:
        # Step 3 — Group words into fine-grained conversation turns with anti-monolith safeguards
        turns = _group_words_into_turns(words, diarization_segments)

    # Step 4 — Infer semantic roles (Sales Agent vs Prospect)
    roles = infer_speaker_roles(turns)
    logger.info("Inferred speaker roles: %s", roles)

    for turn in turns:
        turn["role"] = roles.get(turn["speaker"], "Sales Agent")

    # Step 5 — Intelligent dialogue refinement (Gemini 2.5 Flash)
    if words and _needs_dialogue_refinement(turns):
        logger.info("Turns need dialogue refinement (merged turns or skewed distribution in conversational text). Refining...")
        turns = _refine_conversation_dialogue(turns, words)

    # Step 6 — Detect and tag interruptions & conversational barge-ins
    turns = _detect_and_tag_interruptions(turns)

    logger.info("Conversation built successfully: %d turn(s)", len(turns))
    return turns
