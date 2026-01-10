import { NextResponse } from "next/server";
import { getWaitlistCount } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = await getWaitlistCount();

    return NextResponse.json(
      { count: result.count },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching waitlist count:", error);
    return NextResponse.json({ count: 27 }, { status: 200 });
  }
}
