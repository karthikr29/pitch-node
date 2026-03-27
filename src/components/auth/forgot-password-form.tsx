"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { resetPassword } from "@/app/(auth)/actions";
import { AuthStatusCard } from "@/components/auth/auth-status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateEmail } from "@/lib/validators";

const SUCCESS_MESSAGE = "If we found an account for that email, we sent a reset link.";
const INVALID_LINK_MESSAGE =
  "This password reset link is invalid, expired, or already used. Request a new one to continue.";

export function ForgotPasswordForm({
  initialError,
}: {
  initialError?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showInvalidLinkState, setShowInvalidLinkState] = useState(
    initialError === "invalid_or_expired"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error ?? "Please enter a valid email address");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.set("email", email);

    const result = await resetPassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
        {submitted ? (
          <AuthStatusCard
            title="Check your email"
            description={SUCCESS_MESSAGE}
            actions={
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setError("");
                }}
              >
                Send another link
              </Button>
            }
            footer={
              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Back to sign in
                </Link>
              </p>
            }
          />
        ) : showInvalidLinkState ? (
          <AuthStatusCard
            title="Reset link unavailable"
            description={INVALID_LINK_MESSAGE}
            tone="destructive"
            actions={
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setShowInvalidLinkState(false);
                  setError("");
                }}
              >
                Request a new reset link
              </Button>
            }
            footer={
              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Back to sign in
                </Link>
              </p>
            }
          />
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-display">Reset your password</CardTitle>
              <CardDescription>
                Enter the email address you use to sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-2.5"
                  >
                    {error}
                  </motion.p>
                )}

                <Button type="submit" size="lg" disabled={loading} className="w-full group">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Remembered it?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </motion.div>
  );
}
