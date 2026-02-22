from app.prompts.system_prompts import build_system_prompt


BASE_PERSONA = {
    "name": "Alex Morgan",
    "title": "VP Operations",
    "description": "Detail-oriented and pragmatic buyer.",
    "behavior_profile": {
        "communication_style": "direct",
        "decision_making": "analytical",
        "key_concerns": ["execution risk", "ROI clarity"],
        "pain_points": ["slow onboarding"],
    },
    "difficulty_modifiers": {},
}


def test_pitch_prompt_includes_structured_briefing_fields():
    scenario = {
        "call_type": "pitch",
        "difficulty": "medium",
        "description": "Pitch your product to a potential investor.",
        "context_briefing": {"situation": "Series A investor pitch"},
        "objectives": ["Communicate value clearly"],
    }
    pitch_briefing = {
        "whatYouSell": "AI outbound assistant",
        "targetAudience": "B2B SaaS sales teams",
        "problemSolved": "Low outbound conversion",
        "valueProposition": "More qualified meetings",
        "callGoal": "Secure pilot agreement",
        "additionalNotes": "Competing against in-house process",
    }

    prompt = build_system_prompt(
        scenario=scenario,
        persona=BASE_PERSONA,
        pitch_context="AI outbound assistant for SaaS sales teams",
        pitch_briefing=pitch_briefing,
    )

    assert "## Pitch Briefing" in prompt
    assert "What they sell: AI outbound assistant" in prompt
    assert "Target audience: B2B SaaS sales teams" in prompt
    assert "Call goal: Secure pilot agreement" in prompt


def test_pitch_prompt_difficulty_changes_between_easy_and_expert():
    scenario_easy = {
        "call_type": "pitch",
        "difficulty": "easy",
        "description": "Easy pitch",
        "context_briefing": {},
        "objectives": [],
    }
    scenario_expert = {
        "call_type": "pitch",
        "difficulty": "expert",
        "description": "Expert pitch",
        "context_briefing": {},
        "objectives": [],
    }

    prompt_easy = build_system_prompt(scenario_easy, BASE_PERSONA, pitch_context="test")
    prompt_expert = build_system_prompt(scenario_expert, BASE_PERSONA, pitch_context="test")

    assert "friendly and low-pressure" in prompt_easy
    assert "high-pressure and highly analytical" in prompt_expert

