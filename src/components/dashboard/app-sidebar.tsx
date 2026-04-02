"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Image,
  CalendarDays,
  Bell,
  Users,
  Heart,
  Home,
  Settings,
  LogOut,
  ChevronsUpDown,
  AppWindow,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Posts: FileText,
  Photos: Image,
  Events: CalendarDays,
  Updates: Bell,
  Services: AppWindow,
  Members: Users,
  Memorial: Heart,
};

interface NavLink {
  href: string;
  label: string;
}

interface AppSidebarProps {
  navLinks: NavLink[];
  userName: string;
  userEmail: string;
  userRole: string;
}

export function AppSidebar({ navLinks, userName, userEmail, userRole }: AppSidebarProps) {
  const pathname = usePathname();

  const userInitial = userName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-foreground text-sm font-medium">Dashboard</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navLinks.map((link) => {
              const Icon = iconMap[link.label];
              const isActive =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);

              return (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={link.label}>
                    <Link href={link.href}>
                      {Icon && <Icon />}
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="size-6 shrink-0 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                    {userInitial}
                  </div>
                  <span className="truncate text-sm">{userName}</span>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-64 p-0"
              >
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-popover-foreground truncate">
                    {userName}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-muted-foreground truncate">
                      {userEmail}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {userRole}
                  </p>
                </div>
                <Separator />
                <div className="p-1">
                  <Link
                    href="/"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors"
                  >
                    <Home className="size-4" />
                    Home
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors"
                  >
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </div>
                <Separator />
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
