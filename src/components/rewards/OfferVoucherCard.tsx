"use client";

import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas-pro";
import {
  Download,
  Copy,
  Check,
  Sparkles,
  X,
} from "lucide-react";
import {
  LOREAL_EVENT_TERMS,
  cleanPhoneNumber,
} from "@/lib/whatsapp";
import { getOfferProductImage } from "@/lib/rewardStorage";

export interface OfferVoucherCardProps {
  customerName?: string;
  customerPhone?: string;
  wonItem: string;
  offerId: string;
  eventDate?: string;
  eventTime?: string;
  salonName?: string;
  salonAddress?: string;
  onClose?: () => void;
  showModalWrapper?: boolean;
}

export function OfferVoucherCard({
  customerName = "Valued Guest",
  customerPhone = "",
  wonItem,
  offerId,
  salonName = "Belezia Salon",
  onClose,
  showModalWrapper = false,
}: OfferVoucherCardProps) {
  const voucherRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copy Offer ID to Clipboard
  const handleCopyOfferId = async () => {
    try {
      await navigator.clipboard.writeText(offerId);
      setCopiedId(true);
      showToast("📋 Offer Code copied to clipboard!");
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      showToast("Could not copy Offer Code");
    }
  };

  // Trigger fallback anchor click download of JPG
  const triggerJpgDownload = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📸 Voucher image (.jpg) saved to Gallery!");
    setIsExporting(false);
  };

  // Download Voucher as High-Resolution JPG Image directly into mobile gallery / downloads
  const handleDownloadImage = async () => {
    if (!voucherRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(voucherRef.current, {
        scale: 3, // Crisp 3x retina resolution
        useCORS: true,
        backgroundColor: "#09090b",
        logging: false,
      } as any);

      const safeId = offerId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `Belezia_Voucher_${safeId}.jpg`;
      const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.95);

      // On mobile devices supporting Web Share API with files, trigger native system save to Photos / Gallery
      if (typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], fileName, { type: "image/jpeg" });
            if (navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: "Belezia Reward Voucher",
                  text: `Congratulations ${customerName}! Here is your voucher for ${wonItem}. Offer Code: ${offerId}`,
                });
                showToast("📸 Voucher saved / shared!");
                setIsExporting(false);
                return;
              } catch (e: any) {
                if (e.name === "AbortError") {
                  setIsExporting(false);
                  return;
                }
              }
            }
          }
          triggerJpgDownload(jpgDataUrl, fileName);
        }, "image/jpeg", 0.95);
      } else {
        triggerJpgDownload(jpgDataUrl, fileName);
      }
    } catch (err) {
      console.error("Failed to generate voucher image:", err);
      showToast("Failed to save image. Please take a screenshot!");
      setIsExporting(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md mx-auto flex flex-col items-center select-none text-white">
      {/* TOAST MESSAGE BANNER */}
      {toastMessage && (
        <div className="fixed top-5 z-[100] px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs shadow-2xl animate-in slide-in-from-top duration-200">
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAPTURE CONTAINER: MINIMAL VIP REWARD PASS */}
      {/* ========================================================================= */}
      <div
        ref={voucherRef}
        id="offer-voucher-card"
        style={{
          backgroundColor: "#09090b",
          color: "#ffffff",
          borderColor: "#d97706",
        }}
        className="relative w-full rounded-3xl border-2 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.25)] p-5 sm:p-6 overflow-hidden flex flex-col items-center"
      >
        {/* GOLD METALLIC TOP ACCENT */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #d97706, #fbbf24, #f59e0b, #d97706)",
          }}
        />

        {/* 1. ON TOP TITLE */}
        <div className="text-center space-y-1 mb-4 mt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-black tracking-widest uppercase shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>L&apos;Oréal Day • Special Offer</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase drop-shadow-sm">
            {salonName}
          </h2>
          <p className="text-[11px] text-zinc-400 font-medium">Laxmi Nagar, Delhi</p>
        </div>

        {/* 2. CUSTOMER NAME + CONGRATULATIONS YOU WON THIS + PRODUCT PHOTO */}
        <div className="w-full bg-gradient-to-b from-amber-500/15 via-purple-500/10 to-zinc-900 border border-amber-500/40 rounded-3xl p-5 text-center mb-4 flex flex-col items-center shadow-lg">
          {/* Large Hero Real Product Photo */}
          <div className="h-44 w-44 sm:h-52 sm:w-52 rounded-3xl bg-white border-2 border-amber-400/70 p-3 mb-3 shadow-2xl overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOfferProductImage(wonItem)}
              alt={wonItem}
              className="h-full w-full object-contain filter drop-shadow-md"
            />
          </div>
          <div className="text-sm sm:text-base font-extrabold text-amber-300 tracking-wide">
            🎉 Congratulations {customerName}!
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-1 drop-shadow-sm">
            You Won {wonItem}
          </div>
        </div>

        {/* 3. REWARD CLAIM CODE + QR CODE */}
        <div className="w-full bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3 shadow-inner">
          <div className="text-left flex-1 min-w-0">
            <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 font-bold block">
              Reward Claim Code
            </span>
            <span className="text-lg sm:text-xl font-mono font-black text-amber-400 tracking-wider block truncate">
              {offerId}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              Show this code at Belezia Salon desk
            </span>
          </div>
          <div className="bg-white p-1 rounded-xl shadow-md shrink-0">
            <QRCodeSVG
              value={`BELEZIA:${offerId}:${wonItem}`}
              size={54}
              level="M"
              className="rounded"
            />
          </div>
        </div>

        {/* 4. THEN DISCLAIMER */}
        <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left">
          <div className="text-[9px] uppercase font-mono tracking-widest text-amber-400 font-black mb-1">
            Official Disclaimer
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-300 font-medium">
            {LOREAL_EVENT_TERMS}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTION BUTTONS (DOWNLOAD JPG ONLY - NO PDF) */}
      {/* ========================================================================= */}
      <div className="w-full mt-4 space-y-2">
        {/* DOWNLOAD IMAGE (JPG) - SAVES DIRECTLY TO GALLERY */}
        <button
          onClick={handleDownloadImage}
          disabled={isExporting}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 hover:brightness-110 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>{isExporting ? "Saving to Gallery..." : "Download Image (Save to Gallery .jpg)"}</span>
        </button>

        {/* COPY CODE & DONE BUTTONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyOfferId}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copiedId ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Code Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-zinc-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (showModalWrapper) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
        <div className="relative w-full max-w-md my-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-50 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700 shadow-xl cursor-pointer"
              aria-label="Close Voucher"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {cardContent}
        </div>
      </div>
    );
  }

  return cardContent;
}
