"""Prompts for post-call analysis and scoring."""
import json

def get_analysis_prompt(transcript: list[dict], scenario: dict, persona: dict) -> str:
    formatted_transcript = "\n".join([
        f"{'[Sales Rep]' if t['speaker'] == 'user' else f'[{persona.get(\"name\", \"Prospect\")}]'}: {t['content']}"
        for t in transcript
    ])

    return f"""Analyze this sales training call and provide detailed scoring and feedback.

## Scenario
Type: {scenario.get('call_type', 'unknown')}
Difficulty: {scenario.get('difficulty', 'medium')}
Description: {scenario.get('description', '')}
Objectives: {json.dumps(scenario.get('objectives', []))}

## Persona
Name: {persona.get('name', 'Unknown')}
Type: {persona.get('persona_type', 'unknown')}

## Transcript
{formatted_transcript}

## Instructions
Score each metric from 0-100 and provide specific feedback. Return ONLY valid JSON:

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

Be fair but constructive. Score relative to the difficulty level."""
