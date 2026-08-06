// components/login-form.tsx
// Inline sign-in / sign-up form for /login. The navbar's AuthCompact is
// a popover, which left the login page with no visible form — this is
// the real form, and it returns the user to wherever they came from.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle } from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

export default function LoginForm({ from }: { from: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(
    null
  );

  // Already signed in (or just signed in) → go where they were headed.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(from);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(from);
    });
    return () => subscription.unsubscribe();
  }, [from, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setMessage(
        error
          ? { text: error.message, type: "error" }
          : { text: "Password reset link sent — check your email.", type: "success" }
      );
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setMessage(
        error
          ? { text: error.message, type: "error" }
          : { text: "Check your email for a confirmation link.", type: "success" }
      );
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ text: error.message, type: "error" });
      else router.replace(from); // onAuthStateChange also fires
    }

    setLoading(false);
  }

  return (
    <Card className="mx-auto max-w-md text-left">
      <CardContent className="pt-6">
        {message && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-md p-3 text-sm ${
              message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}
          >
            {message.type === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm">
          {mode === "signin" && (
            <>
              <p className="text-gray-600">
                New to SkyBall?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary underline"
                >
                  Create an account
                </button>
              </p>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-gray-500 underline"
              >
                Forgot your password?
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="font-medium text-primary underline"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
