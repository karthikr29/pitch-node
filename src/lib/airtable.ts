// Airtable configuration
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appIEyYTdOAODDzE7";
const AIRTABLE_TABLE_NAME = "Waitlist Signups";
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

// Check if Airtable is properly configured
const isAirtableConfigured =
  AIRTABLE_API_KEY &&
  AIRTABLE_API_KEY !== "YOUR_AIRTABLE_API_KEY" &&
  AIRTABLE_BASE_ID !== "YOUR_AIRTABLE_BASE_ID";

interface WaitlistRecord {
  name: string;
  email: string;
  experienceRating: number;
}

interface AirtableResponse {
  success: boolean;
  error?: string;
  recordId?: string;
}

interface WaitlistCountResponse {
  count: number;
  error?: string;
}

// Simple in-memory cache for count
let cachedCount: { value: number; timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds - reduced for faster updates

export async function createWaitlistRecord(
  data: WaitlistRecord
): Promise<AirtableResponse> {
  if (!isAirtableConfigured) {
    console.warn(
      "Airtable not configured. Simulating success.",
      "API Key exists:", !!AIRTABLE_API_KEY,
      "Base ID:", AIRTABLE_BASE_ID
    );
    // Return success for development without proper Airtable configuration
    return { success: true, recordId: "simulated_" + Date.now() };
  }

  console.log("Creating Airtable record for:", data.email);

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
        AIRTABLE_TABLE_NAME
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Name: data.name,
                Email: data.email,
                "Experience Rating": data.experienceRating,
                Source: "Landing Page",
                Status: "New",
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Airtable error:", errorData);

      // Check if it's a field-related error
      if (errorData?.error?.message?.includes("Unknown field name")) {
        console.error("❌ Missing field in Airtable. Please add 'Experience Rating' (Number type) column to your table.");
        return { success: false, error: "Failed to save to waitlist. Please check server logs." };
      }

      return { success: false, error: "Failed to save to waitlist" };
    }

    const result = await response.json();
    console.log("✅ Successfully created Airtable record:", result.records?.[0]?.id);
    return { success: true, recordId: result.records?.[0]?.id };
  } catch (error) {
    console.error("Airtable request failed:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function checkDuplicateEmail(
  email: string
): Promise<{ exists: boolean; error?: string }> {
  if (!isAirtableConfigured) {
    return { exists: false };
  }

  try {
    const formula = encodeURIComponent(`{Email} = '${email}'`);
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
        AIRTABLE_TABLE_NAME
      )}?filterByFormula=${formula}&maxRecords=1`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return { exists: false };
    }

    const result = await response.json();
    return { exists: result.records?.length > 0 };
  } catch {
    return { exists: false };
  }
}

const BASE_COUNT = 27; // Starting count before Airtable tracking began

export async function getWaitlistCount(): Promise<WaitlistCountResponse> {
  // Return cached value if still valid
  if (cachedCount && Date.now() - cachedCount.timestamp < CACHE_TTL) {
    console.log("📊 Returning cached count:", cachedCount.value);
    return { count: cachedCount.value };
  }

  if (!isAirtableConfigured) {
    console.warn("⚠️ Airtable not configured, returning base count:", BASE_COUNT);
    // Return base count when Airtable is not properly configured
    return { count: BASE_COUNT };
  }

  console.log("🔄 Fetching fresh count from Airtable...");

  try {
    // Fetch all records with minimal fields to count them
    // Airtable returns max 100 records per page, so we need to paginate
    let totalCount = 0;
    let offset: string | undefined;

    do {
      const url = new URL(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
          AIRTABLE_TABLE_NAME
        )}`
      );
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("fields[]", "Email"); // Minimal field to reduce payload
      if (offset) {
        url.searchParams.set("offset", offset);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Airtable count error:", errorText);
        return {
          count: cachedCount?.value ?? BASE_COUNT,
          error: "Failed to fetch count",
        };
      }

      const result = await response.json();
      totalCount += result.records?.length ?? 0;
      offset = result.offset;
    } while (offset);

    // Add base count to Airtable count
    const finalCount = BASE_COUNT + totalCount;

    console.log(`✅ Airtable records: ${totalCount}, Base count: ${BASE_COUNT}, Final count: ${finalCount}`);

    // Update cache
    cachedCount = { value: finalCount, timestamp: Date.now() };

    return { count: finalCount };
  } catch (error) {
    console.error("Airtable count request failed:", error);
    return {
      count: cachedCount?.value ?? BASE_COUNT,
      error: "Network error",
    };
  }
}
