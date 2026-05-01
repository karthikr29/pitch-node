import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

function getMetadataString(user: User, keys: string[]) {
  for (const key of keys) {
    const value = user.user_metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function getDisplayNameFromAuth(user: User) {
  return (
    getMetadataString(user, ["full_name", "name"]) ||
    user.email?.split("@")[0] ||
    null
  );
}

export function getAvatarUrlFromAuth(user: User) {
  return getMetadataString(user, ["avatar_url", "picture"]);
}

export async function syncUserProfileFromAuth(user: User) {
  try {
    const supabase = createAdminClient();
    const fullName = getDisplayNameFromAuth(user);
    const avatarUrl = getAvatarUrlFromAuth(user);
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) throw selectError;

    const profile: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url?: string;
      updated_at: string;
    } = {
      id: user.id,
      email: user.email ?? "",
      full_name: existingProfile?.full_name ?? fullName,
      updated_at: new Date().toISOString(),
    };

    if (avatarUrl) {
      profile.avatar_url = avatarUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(profile, { onConflict: "id" });

    if (error) throw error;
  } catch {
    // Profile sync is best-effort — a missing service key or transient DB error
    // must not break sign-in or subscription reads that call this function.
  }
}
