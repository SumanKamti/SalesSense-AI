"""
AI Conversation Analysis Service
=================================
Sends a speaker-separated sales conversation to Google Gemini and returns
structured analysis (summary, sentiment, sales score, strengths,
weaknesses, suggestions).
"""

import json
import logging
import re
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

        # --- Call Gemini with active, supported models ---
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        candidate_models = [
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
        ]

        response = None
        last_err = None
        is_rate_limited = False

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
                    logger.info("Analysis succeeded with model: %s", model_name)
                    break
            except Exception as e:
                err_str = str(e)
                logger.warning("Model %s failed: %s. Trying next model...", model_name, err_str)
                last_err = err_str
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                    is_rate_limited = True

        if not response or not response.text:
            if is_rate_limited:
                retry_match = re.search(r"retry in ([\d\.]+s?)", str(last_err), re.IGNORECASE)
                retry_time = f" (retry in ~{retry_match.group(1)})" if retry_match else ""
                raise AnalysisError(
                    f"Gemini API rate limit reached on Free Tier{retry_time}. "
                    "Please wait about a minute and try again, or create a fresh Gemini API key at https://aistudio.google.com."
                )
            raise AnalysisError(f"AI evaluation service could not process the request. Details: {last_err}")

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
            "Gemini returned an unparseable response. Please try again."
        ) from exc
    except Exception as exc:
        logger.exception("Gemini analysis failed.")
        raise AnalysisError(
            f"AI analysis failed: {exc}"
        ) from exc
