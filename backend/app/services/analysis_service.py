"""
AI Conversation Analysis Service
=================================
Sends a speaker-separated sales conversation to Google Gemini and returns
structured analysis (summary, sentiment, sales score, strengths,
weaknesses, suggestions).
"""

import json
import logging
from typing import Any, Dict, List

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class AnalysisError(Exception):
    """An error occurred during AI analysis."""


class APIKeyMissingError(Exception):
    """The Gemini API key is not configured."""


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are an expert sales conversation analyst.
You will be given a sales conversation between speakers.
Analyze ONLY the supplied conversation. Do NOT invent information.

Return your analysis as a single JSON object with exactly these keys:
- "summary": a short paragraph summarizing the conversation.
- "sentiment": one of "Positive", "Neutral", or "Negative" — the overall customer sentiment.
- "sales_score": an integer from 0 to 100 rating the sales agent's performance.
- "strengths": an array of strings listing what the sales agent did well.
- "weaknesses": an array of strings listing areas where the sales agent could improve.
- "suggestions": an array of strings with actionable recommendations for the sales agent.

Rules:
- Return ONLY the JSON object. No markdown, no code fences, no extra text.
- strengths, weaknesses, and suggestions should each have 2-5 items.
- Be specific and reference actual parts of the conversation."""


def _format_conversation(conversation: List[Dict[str, str]]) -> str:
    """Format the conversation list into a readable transcript string."""
    lines = []
    for turn in conversation:
        speaker = turn.get("speaker", "Unknown")
        # Map SPEAKER_00 to Sales Agent, others to Customer (matches frontend)
        if speaker == "SPEAKER_00":
            speaker = "Sales Agent"
        elif speaker.startswith("SPEAKER_"):
            speaker = "Customer"
        text = turn.get("text", "")
        lines.append(f"{speaker}: {text}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_conversation(conversation: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Send the conversation to Gemini and return structured analysis.

    Args:
        conversation: List of dicts with ``speaker`` and ``text`` keys.

    Returns:
        A dict with keys: summary, sentiment, sales_score, strengths,
        weaknesses, suggestions.

    Raises:
        APIKeyMissingError: If ``GEMINI_API_KEY`` is not set.
        AnalysisError: If the Gemini call or response parsing fails.
    """
    if not settings.GEMINI_API_KEY:
        raise APIKeyMissingError(
            "GEMINI_API_KEY is not set in .env. "
            "Get a free key at https://aistudio.google.com"
        )

    try:
        from google import genai

        logger.info("Sending conversation (%d turns) to Gemini…", len(conversation))

        transcript = _format_conversation(conversation)
        user_prompt = (
            "Analyze the following sales conversation:\n\n"
            f"{transcript}"
        )

        # --- Call Gemini with fallback models ---
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        candidate_models = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
        ]

        response = None
        last_err = None
        for model_name in candidate_models:
            try:
                logger.info("Attempting analysis with model: %s", model_name)
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=genai.types.GenerateContentConfig(
                        system_instruction=_SYSTEM_PROMPT,
                        temperature=0.3,
                    ),
                )
                if response and response.text:
                    break
            except Exception as e:
                logger.warning("Model %s failed: %s. Trying next model...", model_name, e)
                last_err = e

        if not response or not response.text:
            raise AnalysisError(f"All Gemini models failed. Last error: {last_err}")

        raw_text = response.text.strip()
        logger.info("Gemini response received (%d chars).", len(raw_text))

        # --- Parse JSON ---
        # Strip markdown code fences if Gemini returns them despite instructions
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        result = json.loads(raw_text)

        # --- Validate required fields ---
        required_keys = {
            "summary", "sentiment", "sales_score",
            "strengths", "weaknesses", "suggestions",
        }
        missing = required_keys - set(result.keys())
        if missing:
            raise AnalysisError(
                f"Gemini response missing required fields: {missing}"
            )

        # Clamp sales_score to 0-100
        result["sales_score"] = max(0, min(100, int(result["sales_score"])))

        # Ensure sentiment is one of the valid values
        valid_sentiments = {"Positive", "Neutral", "Negative"}
        if result["sentiment"] not in valid_sentiments:
            result["sentiment"] = "Neutral"

        # Ensure list fields are actually lists
        for key in ("strengths", "weaknesses", "suggestions"):
            if not isinstance(result[key], list):
                result[key] = [str(result[key])]

        logger.info(
            "Analysis complete — score: %d, sentiment: %s",
            result["sales_score"],
            result["sentiment"],
        )
        return result

    except (APIKeyMissingError, AnalysisError):
        raise
    except json.JSONDecodeError as exc:
        logger.exception("Failed to parse Gemini response as JSON.")
        raise AnalysisError(
            "Gemini returned an invalid response. Please try again."
        ) from exc
    except Exception as exc:
        logger.exception("Gemini analysis failed.")
        raise AnalysisError(
            f"AI analysis failed: {exc}"
        ) from exc
