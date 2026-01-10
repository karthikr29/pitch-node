"use server";

import { createWaitlistRecord, checkDuplicateEmail, getWaitlistCount } from "@/lib/airtable";
import { validateName, validateEmail } from "@/lib/validators";

interface WaitlistFormData {
  name: string;
  email: string;
  experienceRating: number;
}

interface SubmitResult {
  success: boolean;
  error?: string;
  isDuplicate?: boolean;
}

export async function submitWaitlist(data: WaitlistFormData): Promise<SubmitResult> {
  // Server-side validation
  const nameValidation = validateName(data.name);
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.error };
  }

  // Check for duplicate email
  const duplicateCheck = await checkDuplicateEmail(data.email);
  if (duplicateCheck.exists) {
    return {
      success: true, // Treat as success to show thank you screen
      isDuplicate: true,
    };
  }

  // Create record in Airtable
  const result = await createWaitlistRecord({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    experienceRating: data.experienceRating,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

export async function getWaitlistCountAction() {
  return await getWaitlistCount();
}
