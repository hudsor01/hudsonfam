"use client";

import { useState, useRef } from "react";
import { addMemorialMedia, removeMemorialMedia } from "@/lib/memorial-actions";

export function AddMediaForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(formRef.current!);
      await addMemorialMedia(formData);
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add media");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-text-muted mb-1.5">
            URL <span className="text-accent">*</span>
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://images.unsplash.com/..."
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-text-muted mb-1.5">
            Type <span className="text-accent">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          >
            <option value="photo">Photo</option>
            <option value="video">Video</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="caption" className="block text-sm font-medium text-text-muted mb-1.5">
            Caption <span className="text-text-dim">(optional)</span>
          </label>
          <input
            id="caption"
            name="caption"
            type="text"
            placeholder="Describe this photo or video"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-text-muted mb-1.5">
            Sort Order
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={0}
            min={0}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Media"}
      </button>
    </form>
  );
}

interface MediaDeleteButtonProps {
  mediaId: string;
}

export function MediaDeleteButton({ mediaId }: MediaDeleteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Remove this media item?")) return;
    setLoading(true);
    try {
      await removeMemorialMedia(mediaId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-bg/80 border border-border text-red-400 hover:bg-red-400/20 hover:border-red-400/30 transition-colors flex items-center justify-center disabled:opacity-50"
      title="Remove"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
