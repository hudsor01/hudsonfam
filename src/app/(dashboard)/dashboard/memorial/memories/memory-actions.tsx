"use client";

import { useState } from "react";
import { toast } from "sonner";
import { approveMemory, rejectMemory } from "@/lib/memorial-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
      toast.success("Memory approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectMemory(memoryId);
      toast.success(approved ? "Memory removed" : "Memory rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove memory");
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
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-success/15 text-success border border-success/25 hover:bg-success/25 transition-colors disabled:opacity-50"
        >
          Approve
        </button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors disabled:opacity-50"
          >
            {approved ? "Remove" : "Reject"}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approved ? "Remove this memory?" : "Reject this memory?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this memory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={loading}>
              {loading ? "Removing..." : approved ? "Remove" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
