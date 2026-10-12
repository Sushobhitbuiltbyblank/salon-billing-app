"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpinTheWheel } from "@/components/rewards/SpinTheWheel";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function SpinPageContent() {
  const [mounted, setMounted] = useState(false);
  const [isAllowedDomain, setIsAllowedDomain] = useState(true);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("offer_token") || "";
  const name = searchParams.get("name") || "";
  const phone = searchParams.get("phone") || searchParams.get("mobile") || "";

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname || "";
      const isAllowed =
        hostname.includes("belezia-offers") ||
        hostname.includes("offers.belezia") ||
        hostname.includes("localhost") ||
        hostname.includes("127.0.0.1") ||
        hostname.includes("0.0.0.0") ||
        window.location.search.includes("view=offers_only");

      if (!isAllowed) {
        setIsAllowedDomain(false);
        // Strictly prevent game from running on billing domain; redirect to official offers domain
        window.location.replace(`https://belezia-offers.vercel.app/${window.location.search}`);
      }
    }
  }, []);

  if (!mounted || !isAllowedDomain) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-purple-600/30 animate-pulse mb-3">
          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
            <Sparkles className="h-6 w-6 text-amber-400 animate-spin" />
          </div>
        </div>
        <p className="text-xs font-mono font-bold text-amber-300">
          {!isAllowedDomain
            ? "Redirecting to official offers domain (belezia-offers.vercel.app)..."
            : "Loading L'Oréal Lucky Wheel..."}
        </p>
        {!isAllowedDomain && (
          <a
            href={`https://belezia-offers.vercel.app/${typeof window !== "undefined" ? window.location.search : ""}`}
            className="text-xs text-purple-400 underline underline-offset-4 mt-2 font-bold"
          >
            Click here if not redirected automatically
          </a>
        )}
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
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center text-sm font-mono">Loading Belezia Wheel...</div>}>
      <SpinPageContent />
    </Suspense>
  );
}
