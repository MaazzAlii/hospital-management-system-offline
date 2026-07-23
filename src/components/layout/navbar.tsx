"use client";

import { Bell, Menu, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { logout } from "@/app/actions/auth";

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const displayUser = user ?? {
    name: "Dr. Admin",
    email: "admin@lifecareclinic.com",
    role: "Super Admin",
  };

  const initials = displayUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-card px-4 shadow-sm lg:h-[60px] lg:px-6">
      {/* Mobile hamburger — opens sidebar in a Sheet */}
      <Sheet>
        <SheetTrigger
          render={
            <button className="inline-flex items-center justify-center rounded-md border border-input bg-background p-1.5 text-sm shadow-sm md:hidden hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </button>
          }
        />
        <SheetContent side="left" className="flex flex-col p-0 w-64">
          <Sidebar userRole={user?.role} />
        </SheetContent>
      </Sheet>

      {/* Clinic sub-title — desktop only */}
      <div className="flex-1 text-sm font-medium text-muted-foreground hidden md:block">
        LIFE CARE HOSPITAL — Nawagai, Buner
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  {displayUser.avatarUrl && (
                    <AvatarImage
                      src={displayUser.avatarUrl}
                      alt={displayUser.name}
                    />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium leading-none">
                    {displayUser.name}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none mt-1">
                    {displayUser.role}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{displayUser.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {displayUser.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logout}>
              <DropdownMenuItem
                className="cursor-pointer p-0"
                data-variant="destructive"
              >
                <button type="submit" className="w-full flex items-center gap-2 px-2 py-1.5">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
