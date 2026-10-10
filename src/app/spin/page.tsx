"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppProvider } from "@/context/AppContext";
import { SpinTheWheel } from "@/components/rewards/SpinTheWheel";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function SpinPageContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("offer_token") || "";
  const name = searchParams.get("name") || "";
  const phone = searchParams.get("phone") || searchParams.get("mobile") || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-purple-600/30 animate-pulse mb-3">
          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
            <Sparkles className="h-6 w-6 text-amber-400 animate-spin" />
          </div>
        </div>
        <p className="text-xs font-mono font-bold text-amber-300">Loading L&apos;Oréal Lucky Wheel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-2 sm:p-4 selection:bg-purple-500 selection:text-white">
      <div className="relative w-full max-w-4xl my-auto rounded-2xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2.5 sm:p-5 overflow-hidden">
        <SpinTheWheel
          initialToken={token}
          initialName={name}
          initialPhone={phone}
          isExternalLink={true}
          isModal={false}
        />
      </div>
    </div>
  );
}

export default function SpinPage() {
  return (
    <AppProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center text-sm font-mono">Loading Belezia Wheel...</div>}>
        <SpinPageContent />
      </Suspense>
    </AppProvider>
  );
}
