import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_NEXT_PATH = "/auth/reset-password";

function getSafeNext(nextValue: string | null, request: NextRequest) {
  if (!nextValue) {
    return DEFAULT_NEXT_PATH;
  }

  if (nextValue.startsWith("/")) {
    return nextValue;
  }

  try {
    const nextUrl = new URL(nextValue);
    if (nextUrl.origin === request.nextUrl.origin) {
      return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    }
  } catch {
    // Ignore malformed next values and fall back to the default path.
  }

  return DEFAULT_NEXT_PATH;
}

function getInvalidLinkRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/forgot-password";
  url.searchParams.set("error", "invalid_or_expired");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  url.searchParams.delete("next");
  return url;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = getSafeNext(searchParams.get("next"), request);

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(getInvalidLinkRedirect(request));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    return NextResponse.redirect(getInvalidLinkRedirect(request));
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "auth/confirm" },
    });
    return NextResponse.redirect(getInvalidLinkRedirect(request));
  }
}
