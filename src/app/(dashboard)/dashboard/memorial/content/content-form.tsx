"use client";

import { useState } from "react";
import { updateMemorialContent } from "@/lib/memorial-actions";

interface ContentSectionFormProps {
  section: string;
  label: string;
  description: string;
  currentContent: string;
  rows?: number;
}

export function ContentSectionForm({
  section,
  label,
  description,
  currentContent,
  rows = 4,
}: ContentSectionFormProps) {
  const [content, setContent] = useState(currentContent);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const hasChanges = content !== currentContent;

  async function handleSave() {
    setError("");
    setLoading(true);
    setSaved(false);

    try {
      await updateMemorialContent(section, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-text">{label}</h3>
        <p className="text-xs text-text-dim mt-0.5">{description}</p>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={rows}
        className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-y"
      />

      {error && (
        <p className="text-red-400 text-xs bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2 mt-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={loading || !hasChanges}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>

        {saved && (
          <span className="text-xs text-emerald-400 font-medium">Saved</span>
        )}

        {hasChanges && !saved && (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
