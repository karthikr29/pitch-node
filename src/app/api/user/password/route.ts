import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 6;

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Password changes are not available for this account." },
        { status: 400 }
      );
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "user/password" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
