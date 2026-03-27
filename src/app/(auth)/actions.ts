"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/validators";

const MIN_PASSWORD_LENGTH = 6;
const GENERIC_RESET_SUCCESS_MESSAGE =
  "If an account exists for that email, check your inbox for a reset link.";

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (siteUrl) {
    return siteUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  throw new Error("NEXT_PUBLIC_SITE_URL must be set outside development");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: { full_name: formData.get("name") as string },
    },
  };
  const { error } = await supabase.auth.signUp(data);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const validation = validateEmail(email);

  if (!validation.valid) {
    return { error: validation.error };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/reset-password`,
    });

    if (error) {
      if (error.status === 429) {
        return { error: "Too many reset attempts. Please wait a moment and try again." };
      }

      Sentry.captureException(error, {
        tags: { action: "reset_password" },
        extra: { emailDomain: email.split("@")[1] ?? "unknown" },
      });

      return { error: "We couldn't send a reset email right now. Please try again." };
    }

    return { success: GENERIC_RESET_SUCCESS_MESSAGE };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "reset_password" },
    });
    return { error: "We couldn't send a reset email right now. Please try again." };
  }
}

export async function updatePassword(formData: FormData) {
  const newPassword = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "This reset link is invalid or has expired. Request a new one." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      if (error.message.toLowerCase().includes("session")) {
        return { error: "This reset link is invalid or has expired. Request a new one." };
      }

      return { error: error.message };
    }

    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });

    if (signOutError) {
      Sentry.captureException(signOutError, {
        tags: { action: "update_password_sign_out" },
      });
      return {
        error: "Your password was updated, but we couldn't complete sign-out. Please try again.",
      };
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "update_password" },
    });
    return { error: "We couldn't update your password right now. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/login?passwordReset=success");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
