"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { AppTab } from "@/types";
import {
  Receipt,
  LayoutDashboard,
  Users,
  UserCheck,
  History,
  Wallet,
  Package,
  Shield,
} from "lucide-react";

export function BottomNav() {
  const { activeTab, setActiveTab, draftItems, currentUser, setIsAuthModalOpen } = useApp();

  const navItems: Array<{
    id: AppTab;
    label: string;
    icon: any;
    badge?: number | null;
  }> = [
    { id: "pos", label: "POS", icon: Receipt, badge: draftItems.length > 0 ? draftItems.length : null },
    { id: "history", label: "Invoices", icon: History },
    { id: "staff", label: "Staff", icon: Users },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "customers", label: "Clients", icon: UserCheck },
    { id: "expenses", label: "Expenses", icon: Wallet },
    { id: "admin", label: "Admin", icon: Package },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800/80 shadow-2xl safe-area-pb"
    >
      <div className="flex items-center justify-between sm:justify-around overflow-x-auto no-scrollbar px-1 py-1 max-w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-2.5 min-w-[50px] sm:min-w-[58px] rounded-xl transition-all duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? "text-purple-400 font-bold scale-105 bg-purple-500/15"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform ${
                    isActive ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "text-zinc-400"
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-pink-500 text-[9px] font-extrabold text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? "text-purple-300 font-bold" : "text-zinc-400"}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* MOBILE USER SWITCH BUTTON */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 sm:px-2.5 min-w-[48px] rounded-xl text-zinc-400 hover:text-zinc-200 cursor-pointer shrink-0"
          title={currentUser ? "Switch User Profile" : "Sign In"}
        >
          <div
            className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: currentUser?.avatar_color || "#8b5cf6" }}
          >
            {currentUser?.name ? currentUser.name.charAt(0) : <Shield className="h-3 w-3" />}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[44px]">
            {currentUser?.name?.split(" ")[0] || "Sign In"}
          </span>
        </button>
      </div>
    </nav>
  );
}
