"use client";

import { authClient } from "@/lib/auth-client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(!!token);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setTokenValid(data.valid);
        if (data.email) setEmail(data.email);
        if (!data.valid) setError(data.error || "Invalid invite");
        setValidating(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Could not validate invite");
          setValidating(false);
        }
      });
    return () => controller.abort();
  }, [token]);

  if (validating) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Validating invite...</p>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div>
        <h1 className="text-xl font-serif text-foreground mb-2">Invite Required</h1>
        <p className="text-sm text-muted-foreground">
          {error || "Registration is invite-only. Ask a family member for an invite link."}
        </p>
      </div>
    );
  }

  async function handleGoogleSignUp() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message || "Sign up failed");
    } else {
      // Mark invite as used
      fetch(`/api/invite/validate?token=${encodeURIComponent(token!)}`, {
        method: "POST",
      }).catch(() => {});
      router.push("/dashboard");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-serif text-foreground mb-1">Join the Family</h1>
      <p className="text-sm text-muted-foreground mb-6">Create your account to get started</p>

      <button onClick={handleGoogleSignUp} className="w-full bg-primary-foreground text-background rounded-lg py-2.5 px-4 text-sm font-medium hover:bg-primary-foreground/90 transition-colors mb-4 flex items-center justify-center gap-2">
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-dim">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleEmailSignUp} className="space-y-3">
        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary" />
        {error && <p className="text-destructive text-xs">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
