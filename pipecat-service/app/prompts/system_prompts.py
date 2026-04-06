"""System prompt construction for sales training personas.

Prompt composition is explicit per call type so behavior can be tuned independently
for discovery, demo, objection handling, negotiation, follow-up, closing, cold call,
and pitch calls.
"""

from typing import Callable


SPEECH_ONLY_SUFFIX = (
    "\n\n## Speech Output Rule\n"
    "CRITICAL: You are on a live phone call. Only output spoken words. "
    "Never use asterisks, stage directions, or action text "
    "(e.g., *pauses*, *sighs*, *thinks*, *clears throat*). "
    "If you want to convey hesitation, say 'Hmm.' or 'Well...' naturally."
)


CALL_TYPE_KNOWLEDGE = {
    "cold_call": """You have NO idea who is calling or what they sell. You did not request this call.
Treat this as an unexpected interruption and decide quickly whether they earn your attention.""",
    "discovery": """You agreed to take this call and only have a vague sense of what they sell: {pitch_context}.
You have not heard a full pitch yet and are evaluating whether this is relevant.""",
    "demo": """You already understand the high-level offering: {pitch_context}.
Now you are evaluating whether the product actually works for your real use cases.""",
    "objection": """You know what they sell: {pitch_context}, but you have strong unresolved objections.
Challenge weak answers and require convincing responses before softening.""",
    "negotiation": """You have seen the product and are discussing terms for: {pitch_context}.
Push for a better deal while staying realistic and commercially grounded.""",
    "follow_up": """You have prior context on the product: {pitch_context}, but momentum dropped.
Make the caller re-earn attention and explain why this should move forward now.""",
    "closing": """You know this product well: {pitch_context}. You are near decision time but still need
final concerns addressed before committing.""",
    "pitch": """You are the audience in a pitch meeting. The human user on this call is pitching their product to you: {pitch_context}.
You are NOT the seller. Your job is to evaluate their pitch for clarity, credibility, business value, and execution risk.""",
}


CALL_TYPE_INSTRUCTIONS = {
    "cold_call": """- You did not initiate this call.
- If they cannot explain relevance quickly, show impatience.
- You may end the conversation if they do not earn attention.""",
    "discovery": """- Share context without over-volunteering.
- Ask clarifying questions about fit.
- Do not jump to contract terms too early.""",
    "demo": """- Ask for concrete examples and practical implementation detail.
- Compare to alternatives and current workflow.
- Acknowledge strengths only when they are clearly demonstrated.""",
    "objection": """- Surface objections early and specifically.
- Require multiple strong responses before changing stance.
- Rotate concerns across price, risk, timing, and alternatives.""",
    "negotiation": """- Push for favorable terms.
- Ask about flexibility, support, and implementation risk.
- Balance budget pressure with practical decision constraints.""",
    "follow_up": """- You may be lukewarm and difficult to re-engage.
- Be transparent about why momentum stalled.
- Do not fake enthusiasm you do not feel.""",
    "closing": """- Focus on final blockers and risk mitigation.
- Ask precise last-mile questions.
- You can commit only after concerns are convincingly handled.""",
    "pitch": """- Evaluate the pitch for clarity, value, differentiation, and realism.
- Ask questions that test assumptions and evidence.
- Challenge weak claims and vague promises.""",
}


def _render_behavior_profile(behavior: dict) -> str:
    if not behavior:
        return "No specific behavior profile provided."
    parts = [
        f"- Communication style: {behavior.get('communication_style', 'professional')}",
        f"- Decision-making: {behavior.get('decision_making', 'analytical')}",
        f"- Key concerns: {', '.join(behavior.get('key_concerns', []))}",
        f"- Pain points: {', '.join(behavior.get('pain_points', []))}",
    ]
    return "\n".join(parts)


def _render_scenario_context(context: dict) -> str:
    if not context:
        return "No specific scenario context provided."
    parts = [context.get("situation", "")]
    if context.get("company"):
        parts.append(f"Company: {context['company']}")
    if context.get("industry"):
        parts.append(f"Industry: {context['industry']}")
    if context.get("budget"):
        parts.append(f"Budget: {context['budget']}")
    return "\n".join(part for part in parts if part)


def _render_standard_difficulty(difficulty_mods: dict, difficulty_level: str) -> str:
    if not difficulty_mods:
        return f"- Difficulty level: {difficulty_level}"

    parts = [
        f"- Objection frequency: {difficulty_mods.get('objection_frequency', 'moderate')}",
        f"- Engagement level: {difficulty_mods.get('engagement_level', 'moderate')}",
        f"- Decision readiness: {difficulty_mods.get('decision_readiness', 'moderate')}",
    ]
    if difficulty_level == "expert":
        parts.append("- Be very challenging. This is the hardest difficulty.")
    return "\n".join(parts)


def _render_pitch_difficulty(difficulty_level: str, difficulty_mods: dict) -> str:
    base = {
        "easy": [
            "- Tone: friendly and low-pressure.",
            "- Ask minimal, straightforward clarification questions.",
            "- Give the caller room to complete their pitch flow.",
        ],
        "medium": [
            "- Tone: professional with moderate skepticism.",
            "- Ask focused follow-up questions on value and practicality.",
            "- Request examples where claims feel generic.",
        ],
        "hard": [
            "- Tone: skeptical and persistent.",
            "- Probe assumptions, risks, and operational feasibility in detail.",
            "- Push on weaknesses and require concrete evidence.",
        ],
        "expert": [
            "- Tone: high-pressure and highly analytical.",
            "- Cross-check claims, challenge contradictions, and stress test edge cases.",
            "- Maintain intensity until responses are precise and defensible.",
        ],
    }.get(difficulty_level, ["- Difficulty level: medium challenge."])

    if difficulty_mods:
        base.extend(
            [
                f"- Objection frequency: {difficulty_mods.get('objection_frequency', 'moderate')}",
                f"- Engagement level: {difficulty_mods.get('engagement_level', 'moderate')}",
                f"- Decision readiness: {difficulty_mods.get('decision_readiness', 'moderate')}",
            ]
        )

    return "\n".join(base)


def _render_pitch_briefing_section(pitch_briefing: dict | None, pitch_context: str) -> str:
    if not pitch_briefing:
        return f"""## Pitch Briefing
Structured briefing not provided. Infer context from:
- {pitch_context}"""

    return f"""## Pitch Briefing
- What they sell: {pitch_briefing.get('whatYouSell', '')}
- Target audience: {pitch_briefing.get('targetAudience', '')}
- Problem solved: {pitch_briefing.get('problemSolved', '')}
- Value proposition: {pitch_briefing.get('valueProposition', '')}
- Call goal: {pitch_briefing.get('callGoal', '')}
- Additional notes: {pitch_briefing.get('additionalNotes') or 'None provided'}"""


def _build_base_prompt(
    *,
    persona: dict,
    scenario: dict,
    call_type: str,
    about_this_call: str,
    call_type_instructions: str,
    behavior_text: str,
    scenario_text: str,
    difficulty_text: str,
    objectives: list,
    pitch_briefing_section: str,
    extra_rules: list[str] | None = None,
    inferred_role: str | None = None,
) -> str:
    rules = [
        "1. Stay in character at all times. You are not an AI assistant.",
        "2. Respond naturally as a real person in a sales conversation.",
        "3. Keep responses concise (typically 1-3 sentences).",
        "4. React realistically to strong and weak sales techniques.",
        "5. Be tough but fair; do not dismiss the caller immediately.",
        "6. If asked to end the call, end politely.",
        "7. Do not invent backstory details absent from scenario context.",
        f"8. The caller's objectives are: {', '.join(objectives)}",
        "9. Write all numbers as words when speaking (e.g., 'thirty' not '30', 'fifty dollars' not '$50', 'seventy-five percent' not '75%'). For times, say 'ten AM' or 'three thirty PM', never '10:00 AM' or '10:00'. This ensures proper speech output.",
        "10. Do NOT use asterisks, stage directions, or action text. Speak with words only.",
    ]
    if extra_rules:
        rules.extend(extra_rules)

    role = inferred_role or persona.get('title', 'a professional')
    return f"""You are {persona['name']}, {role}.

## Your Personality
{persona.get('description', '')}

## About This Call
{about_this_call}

{pitch_briefing_section}

## Call Type Instructions
{call_type_instructions}

## Behavioral Profile
{behavior_text}

## Scenario Context
{scenario_text}

## Call Type: {call_type.replace('_', ' ')}
{scenario.get('description', '')}

## Difficulty Instructions
{difficulty_text}

## Rules
{chr(10).join(rules)}
"""


def _build_cold_call_prompt(**kwargs) -> str:
    return _build_base_prompt(**kwargs)


def _build_discovery_prompt(**kwargs) -> str:
    return _build_base_prompt(**kwargs)


def _build_demo_prompt(**kwargs) -> str:
    return _build_base_prompt(**kwargs)


def _build_objection_prompt(**kwargs) -> str:
    return _build_base_prompt(**kwargs)


def _build_negotiation_prompt(**kwargs) -> str:
    return _build_base_prompt(**kwargs)


def _build_follow_up_prompt(**kwargs) -> str:
    return _build_base_prompt(**kwargs)


def _build_closing_prompt(**kwargs) -> str:
    return _build_base_prompt(**kwargs)


def _build_pitch_prompt(**kwargs) -> str:
    return _build_base_prompt(
        **kwargs,
        extra_rules=[
            "9. Prioritize evaluating pitch clarity, credibility, and business outcomes.",
            "10. Ask progressively deeper questions based on difficulty level.",
        ],
    )


CALL_TYPE_PROMPT_BUILDERS: dict[str, Callable[..., str]] = {
    "cold_call": _build_cold_call_prompt,
    "discovery": _build_discovery_prompt,
    "demo": _build_demo_prompt,
    "objection": _build_objection_prompt,
    "negotiation": _build_negotiation_prompt,
    "follow_up": _build_follow_up_prompt,
    "closing": _build_closing_prompt,
    "pitch": _build_pitch_prompt,
}


def build_system_prompt(
    scenario: dict,
    persona: dict,
    pitch_context: str = "",
    pitch_briefing: dict | None = None,
    inferred_role: str | None = None,
) -> str:
    """Build a system prompt with explicit per-call-type templates."""

    call_type = scenario.get("call_type", "discovery")
    behavior = persona.get("behavior_profile", {})
    difficulty_level = scenario.get("difficulty", "medium")
    difficulty_mods = persona.get("difficulty_modifiers", {}).get(difficulty_level, {})
    context = scenario.get("context_briefing", {})
    objectives = scenario.get("objectives", [])

    pitch_text = pitch_context.strip() if pitch_context else "a product or service (details not provided)"
    about_this_call_template = CALL_TYPE_KNOWLEDGE.get(call_type, CALL_TYPE_KNOWLEDGE["discovery"])
    about_this_call = about_this_call_template.format(pitch_context=pitch_text)
    call_instructions = CALL_TYPE_INSTRUCTIONS.get(call_type, "")
    behavior_text = _render_behavior_profile(behavior)
    scenario_text = _render_scenario_context(context)
    difficulty_text = (
        _render_pitch_difficulty(difficulty_level, difficulty_mods)
        if call_type == "pitch"
        else _render_standard_difficulty(difficulty_mods, difficulty_level)
    )
    pitch_briefing_section = _render_pitch_briefing_section(pitch_briefing, pitch_text)

    resolved_title = inferred_role or persona.get("title", "a professional")

    template = persona.get("system_prompt_template")
    if template:
        try:
            formatted = template.format(
                persona_name=persona["name"],
                persona_title=resolved_title,
                persona_description=persona.get("description", ""),
                pitch_context_block=about_this_call,
                call_type=call_type.replace("_", " "),
                call_type_instructions=call_instructions,
                behavior_profile=behavior_text,
                scenario_context=scenario_text,
                difficulty_rules=difficulty_text,
                objectives=", ".join(objectives),
                pitch_briefing_section=pitch_briefing_section,
            )
            # Auto-inject pitch_briefing_section for templates that don't include the placeholder.
            # All 30 personas currently have custom templates without {pitch_briefing_section},
            # so without this the structured briefing ("What they sell: …") is silently dropped.
            if "{pitch_briefing_section}" not in template and pitch_briefing:
                formatted += f"\n\n{pitch_briefing_section}"
            return formatted + SPEECH_ONLY_SUFFIX
        except (KeyError, IndexError):
            pass

    builder = CALL_TYPE_PROMPT_BUILDERS.get(call_type, _build_discovery_prompt)
    return builder(
        persona=persona,
        scenario=scenario,
        call_type=call_type,
        about_this_call=about_this_call,
        call_type_instructions=call_instructions,
        behavior_text=behavior_text,
        scenario_text=scenario_text,
        difficulty_text=difficulty_text,
        objectives=objectives,
        pitch_briefing_section=pitch_briefing_section,
        inferred_role=inferred_role,
    ) + SPEECH_ONLY_SUFFIX
