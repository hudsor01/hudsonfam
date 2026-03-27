"use client";

import { submitMemory } from "@/lib/memorial-actions";
import { useState, useRef } from "react";

export function MemoryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(formRef.current!);
      await submitMemory(formData);
      setSubmitted(true);
      formRef.current?.reset();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-5 h-5 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <p className="text-text font-serif text-lg mb-2">
          Thank you for sharing
        </p>
        <p className="text-text-muted text-sm mb-6">
          Your memory has been added to this page.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-sm text-accent hover:text-accent/80 transition-colors"
        >
          Share another memory
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs text-text-muted mb-1.5"
          >
            Your Name <span className="text-accent">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Your name"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="relationship"
            className="block text-xs text-text-muted mb-1.5"
          >
            Relationship
          </label>
          <input
            id="relationship"
            name="relationship"
            type="text"
            placeholder="e.g., Son, Friend, Colleague"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-xs text-text-muted mb-1.5"
        >
          Email <span className="text-text-dim">(optional, not displayed)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-xs text-text-muted mb-1.5"
        >
          Your Memory <span className="text-accent">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={5}
          maxLength={5000}
          placeholder="Share a memory, a story, or a few words about what Richard meant to you..."
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors resize-y min-h-[120px]"
        />
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-accent text-bg font-medium rounded-lg px-6 py-2.5 text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Sharing..." : "Share Memory"}
      </button>
    </form>
  );
}
