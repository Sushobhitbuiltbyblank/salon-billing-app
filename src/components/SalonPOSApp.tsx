"use client";

import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { BillingPos } from "@/components/billing/BillingPos";
import { SalesOverview } from "@/components/dashboard/SalesOverview";
import { StaffPerformance } from "@/components/dashboard/StaffPerformance";
import { ExpenseManager } from "@/components/dashboard/ExpenseManager";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { CustomerDirectory } from "@/components/customer/CustomerDirectory";
import { AdminPortal } from "@/components/admin/AdminPortal";
import { InvoicePrintModal } from "@/components/invoice/InvoicePrintModal";
import { EditInvoiceModal } from "@/components/invoice/EditInvoiceModal";
import { WhatsAppShareModal } from "@/components/invoice/WhatsAppShareModal";
import { LoginModal } from "@/components/auth/LoginModal";
import { Scissors } from "lucide-react";

function MainContent() {
  const { activeTab } = useApp();

  return (
    <main
      className={`flex-1 px-3 sm:px-5 py-2 sm:py-3 max-w-[1700px] mx-auto w-full no-print print:hidden ${
        activeTab === "pos"
          ? "pb-20 sm:pb-4 overflow-y-auto xl:overflow-hidden"
          : "pb-24 lg:pb-6 overflow-y-auto overflow-x-hidden"
      }`}
    >
      {activeTab === "pos" && <BillingPos />}
      {activeTab === "customers" && <CustomerDirectory />}
      {activeTab === "dashboard" && <SalesOverview />}
      {activeTab === "staff" && <StaffPerformance />}
      {activeTab === "expenses" && <ExpenseManager />}
      {activeTab === "history" && <RecentInvoices />}
      {(activeTab === "admin" || activeTab === "settings") && <AdminPortal />}
    </main>
  );
}

export default function SalonPOSApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-white p-4">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-0.5 shadow-xl shadow-purple-600/40">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
              <Scissors className="h-7 w-7 text-purple-400 -rotate-45" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-base font-bold tracking-tight text-white">Belezia Luxury Salon POS</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Initializing POS & Catalog Engine...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col bg-[#09090b]">
        <div className="no-print print:hidden">
          <Navbar />
        </div>
        <MainContent />
        <div className="no-print print:hidden">
          <BottomNav />
        </div>
        <InvoicePrintModal />
        <EditInvoiceModal />
        <WhatsAppShareModal />
        <LoginModal />
      </div>
    </AppProvider>
  );
}
