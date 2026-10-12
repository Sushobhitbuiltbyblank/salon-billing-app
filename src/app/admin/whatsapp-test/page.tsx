"use client";

import React from "react";
import Link from "next/link";
import { AppProvider } from "@/context/AppContext";
import { AdminWhatsAppTest } from "@/components/admin/AdminWhatsAppTest";
import { ArrowLeft, MessageSquare } from "lucide-react";

function WhatsAppTestStandaloneWrapper() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Billing POS</span>
            </Link>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-xs font-black tracking-wider uppercase text-zinc-300">
                Admin WhatsApp API Console
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
            Belezia Salon Laxmi Nagar • Automated SMS & WhatsApp Trigger Suite
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6">
        <AdminWhatsAppTest standalone={true} />
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-zinc-800/60 bg-zinc-950/80 py-3 px-4 text-center">
        <p className="text-xs text-zinc-500">
          Belezia Salon POS • WhatsApp Business Cloud API & Webhook Testing Suite • Admin Control Center
        </p>
      </footer>
    </div>
  );
}

export default function WhatsAppTestPage() {
  return (
    <AppProvider>
      <WhatsAppTestStandaloneWrapper />
    </AppProvider>
  );
}
