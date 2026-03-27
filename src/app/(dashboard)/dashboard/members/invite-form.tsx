"use client";

import { useState } from "react";
import { createInvite } from "@/lib/dashboard-actions";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInviteLink("");

    const formData = new FormData();
    if (email) formData.set("email", email);
    formData.set("role", role);

    const token = await createInvite(formData);
    const link = `${window.location.origin}/signup?token=${token}`;
    setInviteLink(link);
    setLoading(false);
    setEmail("");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-text-muted mb-1 block">Email (optional)</label>
          <input
            type="email"
            placeholder="family@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-bg rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Invite"}
        </button>
      </form>

      {inviteLink && (
        <div className="mt-3 bg-bg border border-accent/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <code className="text-xs text-accent flex-1 select-all truncate">{inviteLink}</code>
          <button
            onClick={handleCopy}
            className="text-xs text-text-muted hover:text-text px-2 py-1 border border-border rounded-md transition-colors shrink-0"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
