"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateUserRole, banUser, unbanUser } from "@/lib/dashboard-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface MemberActionsProps {
  userId: string;
  currentRole: string;
  isBanned: boolean;
}

export function MemberActions({ userId, currentRole, isBanned }: MemberActionsProps) {
  const [loading, setLoading] = useState(false);
  const [banReason, setBanReason] = useState("");

  const handleRoleChange = async (newRole: string) => {
    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    setLoading(true);
    try {
      await banUser(userId, banReason);
      toast.success("User banned");
      setBanReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to ban user");
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    setLoading(true);
    try {
      await unbanUser(userId);
      toast.success("User unbanned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unban user");
    } finally {
      setLoading(false);
    }
  };

  if (currentRole === "owner") {
    return null; // Cannot modify owner
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Select
        value={currentRole}
        onValueChange={handleRoleChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[100px] h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">member</SelectItem>
          <SelectItem value="admin">admin</SelectItem>
        </SelectContent>
      </Select>

      {isBanned ? (
        <button
          onClick={handleUnban}
          disabled={loading}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
          Unban
        </button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={loading}
              className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Ban
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ban this user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will prevent the user from accessing the site. You can unban them later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Reason (optional)</label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Why is this user being banned?"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBan} disabled={loading}>
                {loading ? "Banning..." : "Ban User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
