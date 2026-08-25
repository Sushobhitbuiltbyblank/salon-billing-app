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
  Lock,
  LogOut,
  ChevronDown,
  ChevronRight,
  Package,
  Menu,
  X,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
    description: string;
    icon: any;
    badge?: number | null;
  }> = [
    {
      id: "pos",
      label: "Billing POS",
      description: "Quick Billing, Cart & Payments",
      icon: Receipt,
      badge: draftItems.length > 0 ? draftItems.length : null,
    },
    {
      id: "staff",
      label: "Staff & Incentives",
      description: "Stylist Performance, Splits & Roster",
      icon: Users,
    },
    {
      id: "customers",
      label: "Clients CRM",
      description: "Customer Directory & History",
      icon: UserCheck,
    },
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Sales Overview & Analytics",
      icon: LayoutDashboard,
    },
    {
      id: "expenses",
      label: "Expenses",
      description: "Salon Expense Tracker",
      icon: Wallet,
    },
    {
      id: "history",
      label: "Invoices Log",
      description: "Recent Bills, Void & Receipts",
      icon: History,
    },
    {
      id: "admin",
      label: "Catalog & Admin",
      description: "Services, Products & Settings",
      icon: Package,
    },
  ];

  const handleSelectTab = (tabId: AppTab) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

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
          <div className="block">
            <div className="flex items-center gap-1">
              <h1 className="font-bold tracking-tight text-white text-xs sm:text-base flex items-center gap-1 whitespace-nowrap truncate max-w-[140px] sm:max-w-none">
                {settings.salon_name}
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 inline shrink-0" />
              </h1>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate max-w-[140px] sm:max-w-[150px] 2xl:max-w-none hidden xs:block">
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

        {/* RIGHT ACTIONS: LOGGED-IN USER PROFILE, CLOCK & MOBILE MENU TOGGLE */}
        <div className="flex items-center gap-2 shrink-0">
          {/* USER PROFILE CHIP (CLICK TO SWITCH PROFILE / LOGOUT) */}
          {currentUser ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 p-1.5 pr-2 sm:pr-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 transition-all cursor-pointer shadow-sm group shrink-0"
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
              <ChevronDown className="h-3 w-3 text-zinc-400 group-hover:text-white hidden md:block" />
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer shrink-0"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Sign In</span>
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

          {/* MOBILE MENU TOGGLE BUTTON (VISIBLE ON MOBILE / TABLET) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5 text-purple-400" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE FULL NAVIGATION DRAWER */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-zinc-950/95 backdrop-blur-2xl border-b border-zinc-800/80 flex flex-col justify-between overflow-y-auto p-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="space-y-2">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Navigation Menu
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25 font-bold"
                        : "bg-zinc-900/70 hover:bg-zinc-800/80 text-zinc-200 border border-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? "bg-purple-700/60 text-white" : "bg-zinc-800 text-purple-400"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold flex items-center gap-2">
                          {item.label}
                          {item.badge && (
                            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-pink-500 text-[10px] font-extrabold text-white">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isActive ? "text-purple-200" : "text-zinc-400"}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* DRAWER FOOTER / USER & TIME */}
          <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3 pb-6">
            <div className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shadow-inner"
                  style={{ backgroundColor: currentUser?.avatar_color || "#8b5cf6" }}
                >
                  {currentUser?.name ? currentUser.name.charAt(0) : "U"}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    {currentUser?.name || "Guest Receptionist"}
                    {isAdmin && <span className="text-[10px]">👑</span>}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">{time || "Live POS Mode"}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-purple-300 transition-colors"
              >
                Switch User
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

