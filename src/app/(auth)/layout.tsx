export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-lg font-bold">
              H
            </div>
            <span className="text-text text-lg font-medium tracking-wide">
              THE HUDSONS
            </span>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
