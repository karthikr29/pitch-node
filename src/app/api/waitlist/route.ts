import { NextRequest, NextResponse } from "next/server";
import {
  createWaitlistRecord,
  checkDuplicateEmail,
} from "@/lib/supabase";
import { validateName, validateEmail } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, currentRole, experienceRating } = body;

  // Server-side validation
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    return NextResponse.json(
      { success: false, error: nameValidation.error },
      { status: 400 }
    );
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return NextResponse.json(
      { success: false, error: emailValidation.error },
      { status: 400 }
    );
  }

  // Check for duplicate email
  const duplicateCheck = await checkDuplicateEmail(email);
  if (duplicateCheck.exists) {
    return NextResponse.json({ success: true, isDuplicate: true });
  }

  // Prepare cleaned data
  const cleanedData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    currentRole: currentRole.trim(),
    experienceRating,
  };

  const webhookPayload = {
    ...cleanedData,
    timestamp: new Date().toISOString(),
  };

  // Save to Supabase and trigger webhook in parallel
  const [supabaseResult] = await Promise.all([
    createWaitlistRecord(cleanedData),
    fetch(
      "https://n8n.tarsonix.com/webhook/29fc6b00-1556-421c-ae72-3205d7df5773",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }
    )
      .then((response) => {
        console.log("Webhook response status:", response.status);
        if (!response.ok) {
          response
            .text()
            .then((text) => console.error("Webhook error:", text));
        }
      })
      .catch((error) => {
        console.error("Webhook call failed:", error);
      }),
  ]);

  if (!supabaseResult.success) {
    return NextResponse.json(
      { success: false, error: supabaseResult.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
