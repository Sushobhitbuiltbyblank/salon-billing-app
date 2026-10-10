"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppProvider } from "@/context/AppContext";
import { SpinTheWheel } from "@/components/rewards/SpinTheWheel";
import { Scissors, Maximize2, Minimize2, Sparkles, Calendar, MapPin } from "lucide-react";
import { SALON_BOOKING_WHATSAPP } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function SpinPageContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("offer_token") || "";
  const name = searchParams.get("name") || "";
  const phone = searchParams.get("phone") || searchParams.get("mobile") || "";
  const isExternal = Boolean(token || searchParams.get("external") === "true");

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
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
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* TOP EVENT / KIOSK BAR */}
      <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-md shadow-purple-600/30 shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                <Scissors className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 transform -rotate-45" />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-base font-extrabold tracking-tight text-white leading-tight">
                  Belezia Luxury Salon × L’Oréal Professionnel
                </h1>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  Hair Consultation Day
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-400 flex items-center gap-x-1.5 gap-y-0.5 flex-wrap mt-0.5 leading-snug">
                <span className="text-purple-300 font-semibold">Saturday, October 31, 2026</span>
                <span className="text-zinc-600">•</span>
                <span>Laxmi Nagar</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-bold">100% Free Consult</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Tablet Mode"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Tablet Mode"}</span>
            </button>

            <a
              href={`https://wa.me/917290828680?text=Hi%20Belezia%20Salon,%20I%20have%20a%20question%20about%20the%20L'Or%C3%A9al%20Lucky%20Wheel%20Offer!`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shadow-sm"
              title="Need Help? Chat on WhatsApp"
            >
              <span>Salon Help</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN SPIN THE WHEEL INTERFACE */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6">
        <SpinTheWheel
          initialToken={token}
          initialName={name}
          initialPhone={phone}
          isExternalLink={isExternal}
        />
      </main>

      {/* KIOSK / CAMPAIGN FOOTER */}
      <footer className="w-full border-t border-zinc-800/60 bg-zinc-950/80 py-3 px-4 text-center space-y-1">
        <p className="text-[11px] text-zinc-400 font-medium">
          Belezia Salon • Laxmi Nagar, Delhi • Saturday, October 31, 2026 • WhatsApp: {SALON_BOOKING_WHATSAPP}
        </p>
        <p className="text-[10px] text-zinc-500">
          L&apos;Oréal Professionnel Hair Consultation Event • One spin &amp; goodie bag reservation per phone number
        </p>
      </footer>
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
