import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface WaitlistRecord {
  name: string;
  email: string;
  experienceRating: number;
  currentRole: string;
}

interface WaitlistResponse {
  success: boolean;
  error?: string;
  recordId?: string;
}

interface WaitlistCountResponse {
  count: number;
  error?: string;
}

const BASE_COUNT = 18; // Starting count before tracking began

// Simple in-memory cache for count
let cachedCount: { value: number; timestamp: number } | null = null;
const CACHE_TTL = 15000; // 15 seconds

export async function createWaitlistRecord(
  data: WaitlistRecord
): Promise<WaitlistResponse> {
  try {
    const { data: record, error } = await supabase
      .from("waitlist_signups")
      .insert({
        name: data.name,
        email: data.email,
        experience_rating: data.experienceRating,
        job_role: data.currentRole,
        source: "Landing Page",
        status: "New",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return { success: false, error: "Failed to save to waitlist" };
    }

    console.log("Successfully created Supabase record:", record?.id);
    return { success: true, recordId: record?.id };
  } catch (error) {
    console.error("Supabase request failed:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function checkDuplicateEmail(
  email: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("id")
      .eq("email", email.toLowerCase())
      .limit(1);

    if (error) {
      console.error("Supabase duplicate check error:", error);
      return { exists: false };
    }

    return { exists: (data?.length ?? 0) > 0 };
  } catch {
    return { exists: false };
  }
}

export async function getWaitlistCount(): Promise<WaitlistCountResponse> {
  // Return cached value if still valid
  if (cachedCount && Date.now() - cachedCount.timestamp < CACHE_TTL) {
    console.log("Returning cached count:", cachedCount.value);
    return { count: cachedCount.value };
  }

  try {
    const { count, error } = await supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Supabase count error:", error);
      return {
        count: cachedCount?.value ?? BASE_COUNT,
        error: "Failed to fetch count",
      };
    }

    const finalCount = BASE_COUNT + (count ?? 0);
    console.log(`Supabase records: ${count}, Base count: ${BASE_COUNT}, Final count: ${finalCount}`);

    // Update cache
    cachedCount = { value: finalCount, timestamp: Date.now() };

    return { count: finalCount };
  } catch (error) {
    console.error("Supabase count request failed:", error);
    return {
      count: cachedCount?.value ?? BASE_COUNT,
      error: "Network error",
    };
  }
}
