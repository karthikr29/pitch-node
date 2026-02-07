import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("*, scenarios(title, call_type), personas(name, emoji), session_analytics(overall_score)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("*, achievements(*)")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false })
    .limit(5);

  return NextResponse.json({ progress, recentSessions, achievements });
}
