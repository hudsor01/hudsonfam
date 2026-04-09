"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { MemberActions } from "./member-actions";

export type MemberRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
};

function getRoleVariant(role: string): BadgeVariant {
  if (role === "owner") return "accent";
  if (role === "admin") return "primary";
  return "outline";
}

export const memberColumns: ColumnDef<MemberRow>[] = [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => {
      const name = row.original.name;
      const email = row.original.email;
      const role = row.original.role;
      const createdAt = row.original.createdAt;
      const initial = (name || email).charAt(0).toUpperCase();

      return (
        <HoverCard>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 text-left cursor-default"
            >
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initial}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground font-medium truncate">
                {name}
              </span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="start" className="w-64">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="size-9">
                <AvatarFallback className="text-sm">{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {name || "Unnamed"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {email}
                </p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Role</span>
                <Badge variant={getRoleVariant(role)} className="text-[10px]">
                  {role}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Joined</span>
                <span className="text-foreground">
                  {new Date(createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "America/Chicago",
                  })}
                </span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant={getRoleVariant(role)}>{role}</Badge>
          {row.original.banned && (
            <Badge
              variant="default"
              className="bg-destructive/10 text-destructive border-destructive/25"
            >
              banned
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.getValue("email")}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-xs text-text-dim">
        {new Date(row.getValue("createdAt")).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Chicago",
        })}
      </span>
    ),
  },
  {
    id: "actions",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <MemberActions
          userId={row.original.id}
          currentRole={row.original.role}
          isBanned={row.original.banned}
        />
      </div>
    ),
  },
];
