"use client";

import React from "react";
import { AppProvider } from "@/context/AppContext";
import { WheelInventoryManager } from "@/components/admin/WheelInventoryManager";

function WheelInventoryStandaloneWrapper() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6">
        <WheelInventoryManager standalone={true} />
      </main>

      <footer className="w-full border-t border-zinc-800/60 bg-zinc-950/80 py-3 px-4 text-center">
        <p className="text-xs text-zinc-500">
          Belezia Salon POS • Wheel Rewards Inventory Management • Automated Realtime Cloud Decrement
        </p>
      </footer>
    </div>
  );
}

export default function WheelInventoryPage() {
  return (
    <AppProvider>
      <WheelInventoryStandaloneWrapper />
    </AppProvider>
  );
}
