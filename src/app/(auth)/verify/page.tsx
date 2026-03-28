export default function VerifyPage() {
  return (
    <div>
      <h1 className="text-xl font-serif text-foreground mb-2">Check Your Email</h1>
      <p className="text-sm text-muted-foreground">We sent a verification link to your email. Click it to activate your account.</p>
      <p className="text-xs text-text-dim mt-4 text-center">
        <a href="/login" className="text-primary hover:underline">Back to sign in</a>
      </p>
    </div>
  );
}
