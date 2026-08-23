"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { AppTab } from "@/types";
import {
  Scissors,
  Receipt,
  LayoutDashboard,
  Users,
  Wallet,
  History,
  Settings,
  Sparkles,
  Clock,
  Database,
  Shield,
  UserCheck,
  User,
  LogOut,
  ChevronDown,
  Package,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export function Navbar() {
  const {
    activeTab,
    setActiveTab,
    settings,
    draftItems,
    customers,
    currentUser,
    setIsAuthModalOpen,
    logout,
  } = useApp();

  const [time, setTime] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [hasSupabase, setHasSupabase] = useState<boolean>(false);

  useEffect(() => {
    setHasSupabase(isSupabaseConfigured());
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = currentUser?.role === "admin";

  const navItems: Array<{
    id: AppTab;
    label: string;
    icon: any;
    badge?: number | null;
  }> = [
    { id: "pos", label: "Billing POS", icon: Receipt, badge: draftItems.length > 0 ? draftItems.length : null },
    { id: "customers", label: "Clients CRM", icon: UserCheck },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "staff", label: "Staff & Incentives", icon: Users },
    { id: "expenses", label: "Expenses", icon: Wallet },
    { id: "history", label: "Invoices Log", icon: History },
    { id: "admin", label: "Catalog & Admin", icon: Package },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-3 sm:px-5 max-w-[1700px] mx-auto w-full">
        {/* BRAND & SALON NAME */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-0.5 shadow-md shadow-purple-600/30 shrink-0">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
              <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 transform -rotate-45" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold tracking-tight text-white text-sm sm:text-base flex items-center gap-1.5 whitespace-nowrap">
                {settings.salon_name}
                <Sparkles className="h-3.5 w-3.5 text-amber-400 inline" />
              </h1>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[150px] 2xl:max-w-none">
              {settings.tagline}
            </p>
          </div>
        </div>

        {/* DESKTOP / TABLET NAVIGATION */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-zinc-900/90 p-1 xl:p-1.5 rounded-2xl border border-zinc-800/80 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 xl:h-4 xl:w-4 ${isActive ? "text-white" : "text-zinc-400"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-extrabold text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* RIGHT ACTIONS: LOGGED-IN USER PROFILE, CLOCK */}
        <div className="flex items-center gap-2 shrink-0">
          {/* USER PROFILE CHIP (CLICK TO SWITCH PROFILE / LOGOUT) */}
          {currentUser && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 transition-all cursor-pointer shadow-sm group shrink-0"
              title="Click to Switch User / Unlock PIN"
            >
              <div
                className="h-7 w-7 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shadow-inner"
                style={{ backgroundColor: currentUser.avatar_color }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                  {currentUser.name}
                  {isAdmin && <span className="text-[10px]">👑</span>}
                </div>
                <div className="text-[9px] text-purple-300 font-medium capitalize">
                  {currentUser.role === "admin" ? "Super Admin" : "Receptionist"}
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-zinc-400 group-hover:text-white" />
            </button>
          )}

          {/* DIGITAL TIME WIDGET (ONLY ON EXTRA WIDE SCREENS) */}
          <div className="hidden 2xl:flex flex-col items-end px-3 py-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60 shrink-0" suppressHydrationWarning>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-300" suppressHydrationWarning>
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              <span suppressHydrationWarning>{time || "08:30:00 PM"}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-medium" suppressHydrationWarning>{dateStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
