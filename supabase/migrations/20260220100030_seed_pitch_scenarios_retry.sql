-- Seed four pitch scenarios (one per difficulty) while avoiding duplicates.
INSERT INTO public.scenarios (
  call_type,
  difficulty,
  title,
  description,
  context_briefing,
  objectives,
  evaluation_criteria
)
SELECT
  'pitch'::public.call_type,
  v.difficulty::public.difficulty_level,
  v.title,
  v.description,
  v.context_briefing,
  v.objectives,
  '{}'::jsonb
FROM (
  VALUES
    (
      'easy',
      'Product Pitch - Easy',
      'Deliver a concise product pitch to a friendly stakeholder who asks light clarification questions.',
      '{"situation":"First-time product pitch conversation with a generally open audience.","company":"Potential customer with moderate urgency","industry":"SaaS","budget":"Exploratory budget"}'::jsonb,
      ARRAY[
        'Clearly explain what you sell in plain language',
        'Connect product value to a specific business problem',
        'End with a concrete next step'
      ]::text[]
    ),
    (
      'medium',
      'Product Pitch - Medium',
      'Pitch to a practical decision-maker who asks deeper questions about value, differentiation, and rollout.',
      '{"situation":"Business-focused evaluation call after initial interest.","company":"Mid-market buyer evaluating alternatives","industry":"B2B Technology","budget":"Validated but scrutinized"}'::jsonb,
      ARRAY[
        'Demonstrate business outcomes with realistic examples',
        'Address moderate objections with confidence',
        'Secure commitment for follow-up evaluation'
      ]::text[]
    ),
    (
      'hard',
      'Product Pitch - Hard',
      'Defend your pitch against a skeptical audience that challenges assumptions and asks detailed risk questions.',
      '{"situation":"High-scrutiny pitch with a skeptical economic buyer.","company":"Enterprise prospect with strict review process","industry":"Enterprise Software","budget":"Available if risk is controlled"}'::jsonb,
      ARRAY[
        'Handle persistent objections with specific evidence',
        'Prove implementation feasibility under constraints',
        'Maintain clarity and control under pressure'
      ]::text[]
    ),
    (
      'expert',
      'Product Pitch - Expert',
      'Navigate an intense, high-pressure pitch review where every claim is stress-tested for credibility and execution risk.',
      '{"situation":"Final-stage pitch under aggressive scrutiny from senior stakeholders.","company":"Strategic account with competing internal options","industry":"Enterprise / Multi-stakeholder","budget":"High-value but contingent on confidence"}'::jsonb,
      ARRAY[
        'Defend claims with precise and internally consistent answers',
        'Address edge cases, tradeoffs, and competitor pressure',
        'Earn qualified agreement on a concrete decision path'
      ]::text[]
    )
) AS v(difficulty, title, description, context_briefing, objectives)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.scenarios s
  WHERE s.call_type = 'pitch'::public.call_type
    AND s.difficulty = v.difficulty::public.difficulty_level
    AND s.title = v.title
);
