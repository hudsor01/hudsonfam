"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  BookOpen,
  Camera,
  CalendarDays,
  Users,
  Heart,
  LayoutDashboard,
  FileText,
  Image,
  CalendarPlus,
  Bell,
  UserCog,
  FilePlus,
  Upload,
  MessageSquarePlus,
} from "lucide-react";

const publicPages = [
  { label: "Home", href: "/", icon: Home },
  { label: "Blog", href: "/blog", icon: BookOpen },
  { label: "Photos", href: "/photos", icon: Camera },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Family", href: "/family", icon: Users },
  { label: "Memorial", href: "/richard-hudson-sr", icon: Heart },
];

const dashboardPages = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Posts", href: "/dashboard/posts", icon: FileText },
  { label: "Photos", href: "/dashboard/photos", icon: Image },
  { label: "Events", href: "/dashboard/events", icon: CalendarPlus },
  { label: "Updates", href: "/dashboard/updates", icon: Bell },
  { label: "Members", href: "/dashboard/members", icon: UserCog },
  { label: "Memorial", href: "/dashboard/memorial", icon: Heart },
];

const quickActions = [
  { label: "New Post", href: "/dashboard/posts/new", icon: FilePlus },
  { label: "Upload Photos", href: "/dashboard/photos/upload", icon: Upload },
  { label: "New Event", href: "/dashboard/events/new", icon: CalendarPlus },
  { label: "New Update", href: "/dashboard/updates/new", icon: MessageSquarePlus },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Search pages and navigate quickly"
    >
      <CommandInput placeholder="Type a page name..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {publicPages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => navigate(page.href)}
            >
              <page.icon className="size-4 mr-2" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Dashboard">
          {dashboardPages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => navigate(page.href)}
            >
              <page.icon className="size-4 mr-2" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.href}
              onSelect={() => navigate(action.href)}
            >
              <action.icon className="size-4 mr-2" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
