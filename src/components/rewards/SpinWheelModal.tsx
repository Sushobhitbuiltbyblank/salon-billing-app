"use client";

import React, { useEffect } from "react";
import { useApp } from "@/context/AppContext";

export function SpinWheelModal() {
  const { isSpinWheelOpen, setIsSpinWheelOpen } = useApp();

  useEffect(() => {
    if (isSpinWheelOpen) {
      setIsSpinWheelOpen(false);
      const url =
        typeof window !== "undefined" && window.location.hostname.includes("localhost")
          ? "/spin"
          : "https://belezia-offers.vercel.app";
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [isSpinWheelOpen, setIsSpinWheelOpen]);

  return null;
}
