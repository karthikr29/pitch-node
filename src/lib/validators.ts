export function validateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "Name is required" };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: "Email is required" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  return { valid: true };
}

export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { valid: true }; // Phone is optional
  }
  // Basic phone validation - allows various formats
  const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  if (!phoneRegex.test(trimmed.replace(/\s/g, ""))) {
    return { valid: false, error: "Please enter a valid phone number" };
  }
  return { valid: true };
}

export const MAX_FIELD_LENGTHS = {
  whatYouSell: 500,
  targetAudience: 500,
  problemSolved: 500,
  valueProposition: 500,
  callGoal: 300,
  additionalNotes: 1000,
} as const;

export interface PitchBriefing {
  whatYouSell: string;
  targetAudience: string;
  problemSolved: string;
  valueProposition: string;
  callGoal: string;
  additionalNotes?: string;
}

export interface PitchBriefingValidationResult {
  valid: boolean;
  errors: string[];
  value?: PitchBriefing;
}

const pitchRequiredFields: Array<keyof PitchBriefing> = [
  "whatYouSell",
  "targetAudience",
  "problemSolved",
  "valueProposition",
  "callGoal",
];

export function validatePitchBriefing(input: unknown): PitchBriefingValidationResult {
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["pitchBriefing is required for pitch calls"] };
  }

  const raw = input as Record<string, unknown>;
  const errors: string[] = [];

  const normalize = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

  const briefing: PitchBriefing = {
    whatYouSell: normalize(raw.whatYouSell),
    targetAudience: normalize(raw.targetAudience),
    problemSolved: normalize(raw.problemSolved),
    valueProposition: normalize(raw.valueProposition),
    callGoal: normalize(raw.callGoal),
    additionalNotes: normalize(raw.additionalNotes) || undefined,
  };

  for (const field of pitchRequiredFields) {
    if (!briefing[field]) {
      errors.push(`${field} is required for pitch calls`);
    }
  }

  // Enforce field length limits
  for (const [field, maxLen] of Object.entries(MAX_FIELD_LENGTHS) as [keyof typeof MAX_FIELD_LENGTHS, number][]) {
    const val = briefing[field];
    if (val && val.length > maxLen) {
      errors.push(`${field} must be ${maxLen} characters or fewer`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], value: briefing };
}

export function buildPitchContextFromBriefing(briefing: PitchBriefing): string {
  const lines = [
    `What the caller sells: ${briefing.whatYouSell}`,
    `Their target audience: ${briefing.targetAudience}`,
    `Problem their product solves: ${briefing.problemSolved}`,
    `Their value proposition: ${briefing.valueProposition}`,
    `Their call goal: ${briefing.callGoal}`,
  ];

  if (briefing.additionalNotes) {
    lines.push(`Additional notes: ${briefing.additionalNotes}`);
  }

  return lines.join("\n");
}
