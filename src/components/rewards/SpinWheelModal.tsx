"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { SpinTheWheel } from "./SpinTheWheel";
import { X } from "lucide-react";

export function SpinWheelModal() {
  const { isSpinWheelOpen, setIsSpinWheelOpen } = useApp();

  if (!isSpinWheelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-4 sm:p-6 overflow-hidden">
        {/* CLOSE BUTTON */}
        <button
          onClick={() => setIsSpinWheelOpen(false)}
          className="absolute top-4 right-4 z-40 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          aria-label="Close Spin Wheel Modal"
        >
          <X className="h-5 w-5" />
        </button>

        <SpinTheWheel onClose={() => setIsSpinWheelOpen(false)} isModal={true} />
      </div>
    </div>
  );
}
