"use client";

import { useState } from "react";
import { updateUserRole, banUser, unbanUser } from "@/lib/dashboard-actions";

interface MemberActionsProps {
  userId: string;
  currentRole: string;
  isBanned: boolean;
}

export function MemberActions({ userId, currentRole, isBanned }: MemberActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    const reason = prompt("Ban reason (optional):");
    if (reason === null) return; // User cancelled
    setLoading(true);
    try {
      await banUser(userId, reason);
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    setLoading(true);
    try {
      await unbanUser(userId);
    } finally {
      setLoading(false);
    }
  };

  if (currentRole === "owner") {
    return null; // Cannot modify owner
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <select
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={loading}
        className="bg-bg border border-border rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-primary disabled:opacity-50"
      >
        <option value="member">member</option>
        <option value="admin">admin</option>
      </select>

      {isBanned ? (
        <button
          onClick={handleUnban}
          disabled={loading}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
          Unban
        </button>
      ) : (
        <button
          onClick={handleBan}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          Ban
        </button>
      )}
    </div>
  );
}
