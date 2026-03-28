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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Posts: FileText,
  Photos: Image,
  Events: CalendarDays,
  Updates: Bell,
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
  userRole: string;
}

export function AppSidebar({ navLinks, userName, userRole }: AppSidebarProps) {
  const pathname = usePathname();

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
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground truncate">{userName}</p>
          <SidebarMenuButton asChild className="w-auto h-auto p-1">
            <Link href="/">
              <Home className="size-3.5" />
              <span className="text-xs">Home</span>
            </Link>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
