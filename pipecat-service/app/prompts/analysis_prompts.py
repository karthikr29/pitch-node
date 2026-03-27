"""Prompts for post-call analysis and scoring."""
import json


def _get_difficulty_rubric(difficulty: str) -> str:
    rubrics = {
        "easy": """This is an EASY scenario. The prospect is cooperative, low-pressure, and receptive.
Calibrate scores as follows:
- 80–100: Excellent — clearly explained the product, connected value to the prospect's needs, ended with a concrete next step, and built strong rapport. Conversations that felt natural and confident.
- 65–79: Good — met most objectives, communicated value, minor gaps in technique.
- 50–64: Adequate — partial success; explained the product but missed key value connection or closing.
- Below 50: Poor — fundamental failures such as inability to explain the product clearly, lost control of the conversation, or failed to attempt a next step.

On an easy scenario, a call that generally goes well and meets the stated objectives MUST score 70 or above.""",

        "medium": """This is a MEDIUM difficulty scenario. The prospect is professional and asks focused follow-up questions.
Calibrate scores as follows:
- 75–100: Strong — demonstrated specific business outcomes, handled objections with relevant examples, and secured commitment for a next step.
- 60–74: Competent — addressed most questions adequately, handled objections reasonably, some missed opportunities for depth.
- 45–59: Mixed — handled some objections but struggled with harder questions, or failed to secure a clear next step.
- Below 45: Weak — unable to handle core objections, generic or unconvincing answers, lost the prospect's confidence.""",

        "hard": """This is a HARD scenario. The prospect is skeptical, persistent, and challenges assumptions directly.
Calibrate scores as follows:
- 70–100: Excellent — provided specific evidence under pressure, maintained composure and clarity, proved feasibility under constraints.
- 55–69: Good — handled most challenges, occasional retreat under pressure but recovered, showed competence.
- 40–54: Adequate — survived the call but frequently on the back foot, vague responses to key challenges.
- Below 40: Poor — buckled under pressure, could not provide evidence, lost the thread or credibility.""",

        "expert": """This is an EXPERT scenario. The prospect is a senior stakeholder: high-pressure, highly analytical, cross-checking claims.
Calibrate scores as follows:
- 65–100: Outstanding — defended claims with precision, addressed edge cases and competitor comparisons, earned qualified agreement.
- 50–64: Strong — navigated most complexity well, handled key edge cases, minor gaps in precision.
- 35–49: Adequate — coherent under pressure but struggled with detailed analytical questions or contradictions.
- Below 35: Poor — failed to defend core claims, could not handle edge cases, lost credibility with a sophisticated audience.""",
    }
    return rubrics.get(difficulty, rubrics["medium"])


def get_analysis_prompt(transcript: list[dict], scenario: dict, persona: dict) -> str:
    persona_name = persona.get("name", "Prospect")
    difficulty = scenario.get('difficulty', 'medium')

    formatted_transcript = "\n".join([
        f"[{i}] {'[Sales Rep]' if t['speaker'] == 'user' else f'[{persona_name}]'}: {t['content']}"
        for i, t in enumerate(transcript)
    ])

    difficulty_rubric = _get_difficulty_rubric(difficulty)

    total = len(transcript)
    early_end = total // 3
    mid_end = (total * 2) // 3
    min_highlights = max(5, min(10, total // 4))

    return f"""Analyze this sales training call and provide detailed scoring and feedback.

## Scenario
Type: {scenario.get('call_type', 'unknown')}
Difficulty: {difficulty}
Description: {scenario.get('description', '')}
Objectives: {json.dumps(scenario.get('objectives', []))}
Evaluation Criteria: {json.dumps(scenario.get('evaluation_criteria', []))}

## Persona
Name: {persona.get('name', 'Unknown')}
Type: {persona.get('persona_type', 'unknown')}

## Transcript (each line prefixed with its index)
{formatted_transcript}

## Scoring Calibration
{difficulty_rubric}

## Instructions
Score each metric from 0-100 using the calibration above. Return ONLY valid JSON.

IMPORTANT — Highlight coverage rules:
- The transcript has {total} exchanges (indices 0–{total - 1}).
- Early section: indices 0–{early_end}. Mid section: indices {early_end + 1}–{mid_end}. Late section: indices {mid_end + 1}–{total - 1}.
- You MUST include at least 1–2 highlights from EACH section (early, mid, late).
- Generate {min_highlights}–10 highlights total, distributed across the FULL call.
- Do NOT cluster all highlights in the first half. Analyze the ENTIRE transcript end to end.
- timestamp_index must be the exact index shown in brackets at the start of the transcript line that triggered the observation.

{{
  "objection_handling": <0-100>,
  "active_listening": <0-100>,
  "closing_technique": <0-100>,
  "rapport_building": <0-100>,
  "overall_score": <0-100>,
  "highlight_moments": [
    {{"timestamp_index": <int>, "type": "positive"|"negative", "description": "<what happened>", "suggestion": "<what to do differently>"}}
  ],
  "improvement_suggestions": ["<specific actionable suggestion>", ...],
  "summary": "<2-3 sentence overall summary of performance>"
}}

Be specific and constructive. Reference actual moments from the transcript."""
