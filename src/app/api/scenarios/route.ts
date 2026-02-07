import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callType = request.nextUrl.searchParams.get("call_type");
  const difficulty = request.nextUrl.searchParams.get("difficulty");

  let query = supabase.from("scenarios").select("*").order("created_at", { ascending: true });
  if (callType) query = query.eq("call_type", callType);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
