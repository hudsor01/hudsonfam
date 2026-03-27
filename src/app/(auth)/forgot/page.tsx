"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.requestPasswordReset({ email, redirectTo: "/reset" });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-xl font-serif text-text mb-2">Check Your Email</h1>
        <p className="text-sm text-text-muted">If an account exists for {email}, you&apos;ll receive a password reset link.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-serif text-text mb-1">Reset Password</h1>
      <p className="text-sm text-text-muted mb-6">Enter your email to receive a reset link</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary" />
        <button type="submit" disabled={loading} className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <p className="text-xs text-text-dim mt-4 text-center">
        <a href="/login" className="text-primary hover:underline">Back to sign in</a>
      </p>
    </div>
  );
}
