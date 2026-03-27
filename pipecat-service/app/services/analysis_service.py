import json
import httpx
from loguru import logger
from app.config import settings
from app.prompts.analysis_prompts import get_analysis_prompt

class AnalysisService:
    async def analyze_session(self, transcript: list[dict], scenario: dict, persona: dict) -> dict:
        logger.info(
            "analysis: starting",
            extra={"transcript_entries": len(transcript), "scenario_id": scenario.get("id"), "persona_id": persona.get("id")}
        )

        prompt = get_analysis_prompt(transcript, scenario, persona)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.ANALYSIS_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                    },
                    timeout=60.0,
                )
                result = response.json()
            content = result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error("analysis: OpenRouter request failed", extra={"error": str(e)})
            return self._parse_analysis("")

        logger.debug("analysis: OpenRouter responded, parsing", extra={"content_length": len(content)})
        return self._parse_analysis(content)

    def _parse_analysis(self, content: str) -> dict:
        try:
            # Try to extract JSON from the response
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(content[start:end])
                parsed = {
                    "scores": {
                        "objection_handling": data.get("objection_handling", 0),
                        "active_listening": data.get("active_listening", 0),
                        "closing_technique": data.get("closing_technique", 0),
                        "rapport_building": data.get("rapport_building", 0),
                    },
                    "overall_score": data.get("overall_score", 0),
                    "letter_grade": self._score_to_grade(data.get("overall_score", 0)),
                    "highlight_moments": data.get("highlight_moments", []),
                    "improvement_suggestions": data.get("improvement_suggestions", []),
                    "ai_summary": data.get("summary", ""),
                }
                logger.info(
                    "analysis: parsed successfully",
                    extra={
                        "overall_score": parsed["overall_score"],
                        "letter_grade": parsed["letter_grade"],
                        "highlights_count": len(parsed["highlight_moments"]),
                    }
                )
                return parsed
        except (json.JSONDecodeError, KeyError, IndexError):
            logger.warning("analysis: JSON parse failed, returning zero-score fallback", extra={"content_preview": content[:80] if content else ""})
        return {
            "scores": {"objection_handling": 0, "active_listening": 0, "closing_technique": 0, "rapport_building": 0},
            "overall_score": 0,
            "letter_grade": "F",
            "highlight_moments": [],
            "improvement_suggestions": ["Analysis failed. Please try again."],
            "ai_summary": "Unable to analyze this session.",
        }

    @staticmethod
    def _score_to_grade(score: int) -> str:
        if score >= 97: return "A+"
        if score >= 93: return "A"
        if score >= 90: return "A-"
        if score >= 87: return "B+"
        if score >= 83: return "B"
        if score >= 80: return "B-"
        if score >= 77: return "C+"
        if score >= 73: return "C"
        if score >= 70: return "C-"
        if score >= 67: return "D+"
        if score >= 63: return "D"
        if score >= 60: return "D-"
        return "F"
