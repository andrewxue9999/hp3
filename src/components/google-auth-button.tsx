"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleAuthButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin).toString();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Google sign-in");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        className="inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        onClick={handleSignIn}
        type="button"
      >
        {isLoading ? "Redirecting..." : "Continue with Google"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
