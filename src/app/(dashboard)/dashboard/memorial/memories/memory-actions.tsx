"use client";

import { useState } from "react";
import { approveMemory, rejectMemory } from "@/lib/memorial-actions";

interface MemoryActionsProps {
  memoryId: string;
  approved: boolean;
}

export function MemoryActions({ memoryId, approved }: MemoryActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveMemory(memoryId);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to remove this memory? This cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      await rejectMemory(memoryId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {!approved && (
        <button
          onClick={handleApprove}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          Approve
        </button>
      )}
      <button
        onClick={handleReject}
        disabled={loading}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 transition-colors disabled:opacity-50"
      >
        {approved ? "Remove" : "Reject"}
      </button>
    </div>
  );
}
