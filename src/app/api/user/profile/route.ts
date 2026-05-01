import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { syncUserProfileFromAuth } from "@/lib/auth/profile-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function toProfileResponse(profile: {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  country: string | null;
  timezone: string | null;
  plan_type: string;
  subscription_status: string;
}) {
  return {
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    age: profile.age,
    gender: profile.gender,
    phone: profile.phone,
    company: profile.company,
    job_title: profile.job_title,
    country: profile.country,
    timezone: profile.timezone,
    plan_type: profile.plan_type,
    subscription_status: profile.subscription_status,
  };
}

const PROFILE_SELECT =
  "email, full_name, avatar_url, age, gender, phone, company, job_title, country, timezone, plan_type, subscription_status";

const allowedGenders = new Set([
  "female",
  "male",
  "non_binary",
  "prefer_not_to_say",
  "self_describe",
]);

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("Invalid text field");

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new Error(`Text field must be ${maxLength} characters or fewer`);
  return trimmed;
}

function optionalAge(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const age = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(age) || age < 18 || age > 120) {
    throw new Error("Age must be a whole number between 18 and 120");
  }
  return age;
}

function optionalGender(value: unknown) {
  const gender = optionalText(value, 40);
  if (gender === undefined || gender === null) return gender;
  if (!allowedGenders.has(gender)) throw new Error("Invalid gender");
  return gender;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await syncUserProfileFromAuth(user);

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(toProfileResponse(profile));
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "user/profile", method: "GET" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    let updates: Record<string, unknown>;

    try {
      updates = {
        full_name: optionalText(body.full_name ?? body.name, 120),
        age: optionalAge(body.age),
        gender: optionalGender(body.gender),
        phone: optionalText(body.phone, 40),
        company: optionalText(body.company, 120),
        job_title: optionalText(body.job_title, 120),
        country: optionalText(body.country, 80),
        timezone: optionalText(body.timezone, 80),
      };
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid profile fields" },
        { status: 400 }
      );
    }

    updates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No supported profile fields provided" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select(PROFILE_SELECT)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: error?.message ?? "Profile not found" }, { status: 500 });
    }

    return NextResponse.json(toProfileResponse(profile));
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "user/profile", method: "PATCH" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
