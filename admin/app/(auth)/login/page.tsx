"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AdminLoginPage() {
  const supabase = createClientComponentClient();
  const params   = useSearchParams();
  const reason   = params.get("reason");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Hard navigation ensures the auth cookie is sent on the next server request.
    // router.push() can race against cookie propagation in auth-helpers-nextjs.
    window.location.href = "/fulfillment";
  }

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

          {reason === "not-admin" && (
            <p className="rounded-lg bg-orange-900/40 border border-orange-700 text-orange-300 text-sm px-3 py-2">
              Authenticated but not authorized — your user ID is not in the admin_users table.
            </p>
          )}
          {reason === "no-session" && (
            <p className="rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-300 text-sm px-3 py-2">
              Session expired or not found. Please sign in again.
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
