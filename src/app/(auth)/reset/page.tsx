"use client";

import { authClient } from "@/lib/auth-client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div>
        <h1 className="text-xl font-serif text-foreground mb-2">Invalid Link</h1>
        <p className="text-sm text-muted-foreground">
          This reset link is invalid or expired.{" "}
          <a href="/forgot" className="text-primary hover:underline">Request a new one</a>.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await authClient.resetPassword({ newPassword: password, token: token! });
    setLoading(false);
    if (result.error) {
      setError(result.error.message || "Reset failed");
    } else {
      router.push("/login");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-serif text-foreground mb-1">New Password</h1>
      <p className="text-sm text-muted-foreground mb-6">Enter your new password</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary" />
        {error && <p className="text-destructive text-xs">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
