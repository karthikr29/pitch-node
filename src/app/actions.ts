"use server";

import { createWaitlistRecord, checkDuplicateEmail, getWaitlistCount } from "@/lib/supabase";
import { validateName, validateEmail } from "@/lib/validators";

interface WaitlistFormData {
  name: string;
  email: string;
  currentRole: string;
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

  // Prepare the data
  const cleanedData = {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    currentRole: data.currentRole.trim(),
    experienceRating: data.experienceRating,
  };

  // Webhook payload
  const webhookPayload = {
    ...cleanedData,
    timestamp: new Date().toISOString(),
  };

  // Send to Supabase and webhook in parallel
  const [supabaseResult] = await Promise.all([
    // Save to Supabase
    createWaitlistRecord(cleanedData),

    // Trigger n8n webhook (production)
    fetch('https://n8n.tarsonix.com/webhook/29fc6b00-1556-421c-ae72-3205d7df5773', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    }).then(response => {
      console.log('Webhook response status:', response.status);
      if (!response.ok) {
        response.text().then(text => console.error('Webhook error:', text));
      }
    }).catch(error => {
      console.error('Webhook call failed:', error);
    }),
  ]);

  if (!supabaseResult.success) {
    return { success: false, error: supabaseResult.error };
  }

  return { success: true };
}

export async function getWaitlistCountAction() {
  return await getWaitlistCount();
}
