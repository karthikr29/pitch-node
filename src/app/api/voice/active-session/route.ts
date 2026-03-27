import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["connecting", "active"])
    .limit(1)
    .maybeSingle();

  if (data) {
    return NextResponse.json({ hasActiveSession: true, sessionId: data.id, status: data.status });
  }
  return NextResponse.json({ hasActiveSession: false });
}
