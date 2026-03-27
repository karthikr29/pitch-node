import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const personaType = searchParams.get("type");

    let query = supabase.from("personas").select("id, name, title, description, emoji, persona_type, colors, accent, gender, is_active").eq("is_active", true).order("name");

    if (personaType) query = query.eq("persona_type", personaType);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "personas" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
