import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password | ConvoSparr",
  description: "Request a password reset email for your ConvoSparr account.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawError = resolvedSearchParams.error;
  const initialError = Array.isArray(rawError) ? rawError[0] : rawError;

  return <ForgotPasswordForm initialError={initialError} />;
}
