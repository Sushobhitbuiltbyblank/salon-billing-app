"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppProvider } from "@/context/AppContext";
import { SpinTheWheel } from "@/components/rewards/SpinTheWheel";
import { Scissors, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";

function SpinPageContent() {
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
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* TOP KIOSK BAR */}
      <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-0.5 shadow-md shadow-purple-600/30 shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                <Scissors className="h-4 w-4 text-purple-400 transform -rotate-45" />
              </div>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>Belezia Luxury Salon</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Tablet Kiosk
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-400">
                Laxmi Nagar, New Delhi • Customer Spin & Win Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Tablet Mode"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Tablet Mode"}</span>
            </button>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-md shadow-purple-600/30 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to POS</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN SPIN THE WHEEL INTERFACE */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6">
        <SpinTheWheel />
      </main>

      {/* KIOSK FOOTER */}
      <footer className="w-full border-t border-zinc-800/60 bg-zinc-950/60 py-2.5 px-4 text-center">
        <p className="text-[11px] text-zinc-500">
          Belezia Salon Rewards • One spin per visit • Valid for in-salon redemption
        </p>
      </footer>
    </div>
  );
}

export default function SpinPage() {
  return (
    <AppProvider>
      <SpinPageContent />
    </AppProvider>
  );
}
