import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: sessions } = await admin
      .from("sessions")
      .select("id")
      .eq("user_id", user.id);
    const sessionIds = sessions?.map((session) => session.id) ?? [];

    await admin.from("infer_role_calls").delete().eq("user_id", user.id);
    await admin.from("user_achievements").delete().eq("user_id", user.id);
    if (sessionIds.length > 0) {
      await admin.from("session_analytics").delete().in("session_id", sessionIds);
      await admin.from("session_recordings").delete().in("session_id", sessionIds);
      await admin.from("session_transcripts").delete().in("session_id", sessionIds);
    }
    await admin.from("user_credits").delete().eq("user_id", user.id);
    await admin.from("user_progress").delete().eq("user_id", user.id);
    await admin.from("sessions").delete().eq("user_id", user.id);
    await admin.from("profiles").delete().eq("id", user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "user/delete" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
