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
  Shield,
  User,
  Package,
} from "lucide-react";

export function BottomNav() {
  const { activeTab, setActiveTab, draftItems, customers, currentUser, setIsAuthModalOpen } = useApp();

  const isAdmin = currentUser?.role === "admin";

  const navItems: Array<{
    id: AppTab;
    label: string;
    icon: any;
    badge?: number | null;
  }> = [
    { id: "pos", label: "POS", icon: Receipt, badge: draftItems.length > 0 ? draftItems.length : null },
    { id: "customers", label: "Clients", icon: UserCheck },
    { id: "history", label: "Invoices", icon: History },
    { id: "dashboard", label: "Reports", icon: LayoutDashboard },
    { id: "admin", label: "Admin", icon: Package },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
              isActive
                ? "text-purple-400 font-bold scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : "text-zinc-400"}`} />
              {item.badge && (
                <span className="absolute -top-1 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-pink-500 text-[9px] font-extrabold text-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}

      {/* MOBILE USER SWITCH BUTTON */}
      <button
        onClick={() => setIsAuthModalOpen(true)}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 cursor-pointer"
        title={currentUser ? "Switch User Profile" : "Sign In"}
      >
        <div
          className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
          style={{ backgroundColor: currentUser?.avatar_color || "#8b5cf6" }}
        >
          {currentUser?.name ? currentUser.name.charAt(0) : <Shield className="h-3 w-3" />}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[50px]">
          {currentUser?.name?.split(" ")[0] || "Sign In"}
        </span>
      </button>
    </div>
  );
}
