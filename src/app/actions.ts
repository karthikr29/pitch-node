"use server";

import { createWaitlistRecord, checkDuplicateEmail, getWaitlistCount } from "@/lib/supabase";
import { getAppEnvironment, isPreviewEnvironment } from "@/lib/runtime";
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

const DEFAULT_PRODUCTION_WEBHOOK_URL =
  "https://n8n.tarsonix.com/webhook/29fc6b00-1556-421c-ae72-3205d7df5773";

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
  const appEnvironment = getAppEnvironment();
  const configuredWebhookUrl = process.env.WAITLIST_WEBHOOK_URL?.trim();
  const webhookUrl =
    configuredWebhookUrl || (isPreviewEnvironment() ? undefined : DEFAULT_PRODUCTION_WEBHOOK_URL);

  const webhookPayload = {
    ...cleanedData,
    environment: appEnvironment,
    branch: process.env.VERCEL_GIT_COMMIT_REF || "local",
    timestamp: new Date().toISOString(),
  };

  const webhookRequest = webhookUrl
    ? fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      })
        .then((response) => {
          console.log("Webhook response status:", response.status);
          if (!response.ok) {
            response.text().then((text) => console.error("Webhook error:", text));
          }
        })
        .catch((error) => {
          console.error("Webhook call failed:", error);
        })
    : Promise.resolve();

  if (!webhookUrl) {
    console.log("Skipping webhook for preview environment (WAITLIST_WEBHOOK_URL not set).");
  }

  // Send to Supabase and webhook in parallel
  const [supabaseResult] = await Promise.all([
    // Save to Supabase
    createWaitlistRecord(cleanedData),

    // Trigger webhook when configured for the current environment
    webhookRequest,
  ]);

  if (!supabaseResult.success) {
    return { success: false, error: supabaseResult.error };
  }

  return { success: true };
}

export async function getWaitlistCountAction() {
  return await getWaitlistCount();
}
