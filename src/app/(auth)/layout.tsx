import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in to ConvoSparr",
  description:
    "Sign in or create an account to start practicing sales conversations with AI.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}
