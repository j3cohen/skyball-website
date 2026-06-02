"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password"))
    return "Incorrect email or password.";
  if (m.includes("email not confirmed"))
    return "Email not confirmed. Check your inbox for a confirmation link.";
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "Too many sign-in attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error — check your connection and try again.";
  return msg;
}

const REASON_MESSAGES: Record<string, { text: string; style: string }> = {
  "not-admin": {
    text: "This account is not authorized as an admin.",
    style: "bg-orange-900/40 border-orange-700 text-orange-300",
  },
  "no-session": {
    text: "Session expired — please sign in again.",
    style: "bg-yellow-900/40 border-yellow-700 text-yellow-300",
  },
};

export default function AdminLoginPage() {
  const supabase = createClientComponentClient();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [reason,   setReason]   = useState<string | null>(null);

  // Read ?reason= from the URL on the client so it's always available,
  // even when the Suspense boundary hasn't resolved yet.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setReason(p.get("reason"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReason(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(friendlyAuthError(authError.message));
        setLoading(false);
        return;
      }

      // Hard navigation ensures the auth cookie is sent on the next server request.
      // router.push() can race against cookie propagation in auth-helpers-nextjs.
      window.location.href = "/fulfillment";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  const reasonMsg = reason ? REASON_MESSAGES[reason] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-white tracking-tight">SkyBall</span>
          <span className="ml-1 text-2xl font-light text-sky-400">Admin</span>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white
                         placeholder-gray-500 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white
                         placeholder-gray-500 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="••••••••"
            />
          </div>

          {reasonMsg && (
            <p className={`rounded-lg border text-sm px-3 py-2 ${reasonMsg.style}`}>
              {reasonMsg.text}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60
                       text-white font-medium text-sm py-2.5 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
