"use client";

import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas-pro";
import {
  Download,
  Share2,
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
import { removeProductQuantity } from "@/types/rewards";

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
  const displayWonItem = removeProductQuantity(wonItem);
  const voucherRef = useRef<HTMLDivElement>(null);
  const cachedBlobRef = useRef<{
    blob: Blob;
    file: File;
    fileName: string;
  } | null>(null);
  const isGeneratingRef = useRef<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to render high-contrast, crystal-clear, lightweight JPG voucher
  const generateVoucherBlob = async (): Promise<{
    blob: Blob;
    fileName: string;
  } | null> => {
    if (!voucherRef.current) return null;

    try {
      const canvas = await html2canvas(voucherRef.current, {
        scale: 2, // 2x gives crisp retina graphics while keeping JPG size < 80KB
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0a0a0c",
        logging: false,
        imageTimeout: 10000,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById("offer-voucher-card");
          if (el) {
            el.style.backgroundColor = "#0a0a0c";
            el.style.color = "#ffffff";
          }
        },
      } as any);

      const safeId = offerId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `Belezia_Voucher_${safeId}.jpg`;

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, fileName });
            } else {
              resolve(null);
            }
          },
          "image/jpeg",
          0.85 // High-efficiency lightweight JPEG (~60KB - 80KB)
        );
      });
    } catch (err) {
      console.error("Voucher render error:", err);
      return null;
    }
  };

  // Pre-render voucher image in background so download/save triggers with zero delay
  useEffect(() => {
    let isMounted = true;
    const preloadImage = async () => {
      if (isGeneratingRef.current || cachedBlobRef.current) return;
      isGeneratingRef.current = true;
      try {
        await new Promise((r) => setTimeout(r, 200));
        if (!isMounted) return;
        const result = await generateVoucherBlob();
        if (result && isMounted) {
          const file = new File([result.blob], result.fileName, { type: "image/jpeg" });
          cachedBlobRef.current = {
            blob: result.blob,
            file,
            fileName: result.fileName,
          };
        }
      } catch (e) {
        // ignore background preload error
      } finally {
        isGeneratingRef.current = false;
      }
    };
    preloadImage();
    return () => {
      isMounted = false;
    };
  }, [offerId, wonItem, customerName]);

  // Retrieve cached or freshly generated image data
  const getOrGenerateImage = async (): Promise<{
    blob: Blob;
    file: File;
    fileName: string;
  } | null> => {
    if (cachedBlobRef.current) return cachedBlobRef.current;
    const generated = await generateVoucherBlob();
    if (!generated) return null;
    const file = new File([generated.blob], generated.fileName, { type: "image/jpeg" });
    const cached = {
      blob: generated.blob,
      file,
      fileName: generated.fileName,
    };
    cachedBlobRef.current = cached;
    return cached;
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

  // Trigger browser download of lightweight JPG directly into device Gallery / Downloads
  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    showToast("📸 Voucher image saved to Gallery / Downloads!");
    setIsExporting(false);
  };

  // 1. Share: Uses Web Share API on iOS and Android to share the voucher JPG image to other apps (Instagram, WhatsApp, Messages, Photos, etc.)
  const handleShareImage = async () => {
    setIsExporting(true);
    try {
      const data = await getOrGenerateImage();
      if (!data) {
        showToast("Failed to prepare voucher image");
        setIsExporting(false);
        return;
      }

      // Check if native Web Share API can share the JPG image file
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [data.file] })
      ) {
        try {
          await navigator.share({
            files: [data.file],
            title: "Belezia Voucher",
          });
          showToast("✨ Shared successfully!");
          setIsExporting(false);
          return;
        } catch (e: any) {
          if (e.name === "AbortError") {
            setIsExporting(false);
            return;
          }
          // If share was rejected or failed, fall back to direct download
        }
      }

      // Fallback: direct browser download into device storage
      triggerBlobDownload(data.blob, data.fileName);
      showToast("📸 Image downloaded! (Share not supported on this browser)");
    } catch (err) {
      console.error("Share failed:", err);
      showToast("Could not share image. Please take a screenshot!");
      setIsExporting(false);
    }
  };

  // 2. Direct Download JPG
  const handleDownloadJpg = async () => {
    setIsExporting(true);
    try {
      const data = await getOrGenerateImage();
      if (!data) {
        showToast("Failed to generate voucher image");
        setIsExporting(false);
        return;
      }
      triggerBlobDownload(data.blob, data.fileName);
    } catch (err) {
      console.error("Download JPG failed:", err);
      showToast("Failed to download image");
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
      {/* CAPTURE CONTAINER: FULLY INLINE-STYLED TO PREVENT CSS VARIABLE/CLONE BUGS */}
      {/* ========================================================================= */}
      <div
        ref={voucherRef}
        id="offer-voucher-card"
        style={{
          width: "100%",
          maxWidth: "380px",
          backgroundColor: "#0a0a0c",
          color: "#ffffff",
          borderRadius: "24px",
          border: "1.5px solid rgba(245, 158, 11, 0.4)",
          padding: "16px",
          boxSizing: "border-box",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Subtle decorative glowing corner aura */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "140px",
            height: "140px",
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            borderRadius: "9999px",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "140px",
            height: "140px",
            backgroundColor: "rgba(147, 51, 234, 0.12)",
            borderRadius: "9999px",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* HEADER: SALON BRAND & EVENT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "12px",
            borderBottom: "1px solid rgba(63, 63, 70, 0.6)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "monospace",
                color: "#fbbf24",
                fontWeight: 700,
              }}
            >
              Exclusive VIP Pass
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                margin: "2px 0 0 0",
              }}
            >
              {salonName}
            </h2>
          </div>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "9999px",
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              fontSize: "10px",
              fontWeight: 800,
              color: "#fde047",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>L&apos;Oréal Day</span>
          </div>
        </div>

        {/* PRIZE HERO DISPLAY (Strict inline bounds prevent image stretching) */}
        <div
          style={{
            margin: "12px 0",
            padding: "12px",
            borderRadius: "16px",
            backgroundColor: "rgba(24, 24, 27, 0.95)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* Strictly-constrained product image container */}
          <div
            style={{
              width: "64px",
              height: "64px",
              minWidth: "64px",
              minHeight: "64px",
              maxWidth: "64px",
              maxHeight: "64px",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#000000",
              border: "1.5px solid rgba(251, 191, 36, 0.5)",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOfferProductImage(displayWonItem)}
              alt={displayWonItem}
              width={64}
              height={64}
              style={{
                width: "64px",
                height: "64px",
                maxWidth: "64px",
                maxHeight: "64px",
                objectFit: "cover",
                display: "block",
                borderRadius: "10px",
              }}
              crossOrigin="anonymous"
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "9px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#fbbf24",
                fontFamily: "monospace",
              }}
            >
              Reward Won
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: "1.25",
                marginTop: "2px",
                wordBreak: "break-word",
              }}
            >
              {displayWonItem}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#a1a1aa",
                marginTop: "3px",
              }}
            >
              Valid on event day: <strong style={{ color: "#e4e4e7" }}>31st October</strong>
            </div>
          </div>
        </div>

        {/* CUSTOMER DETAILS & FRONT DESK VERIFICATION CODE */}
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "16px",
            backgroundColor: "#000000",
            border: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#71717a",
                fontFamily: "monospace",
              }}
            >
              Claimed By
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#f4f4f5",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {customerName}
            </div>
            {customerPhone && (
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "monospace",
                  color: "#a1a1aa",
                  marginTop: "1px",
                }}
              >
                +91 {cleanPhoneNumber(customerPhone)}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#fbbf24",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              Offer Code
            </div>
            <div
              style={{
                fontSize: "15px",
                fontFamily: "monospace",
                fontWeight: 900,
                color: "#fbbf24",
                letterSpacing: "0.06em",
                marginTop: "1px",
              }}
            >
              {offerId}
            </div>
          </div>
        </div>

        {/* QR CODE FOR FAST FRONT-DESK SCANNING */}
        <div
          style={{
            marginTop: "10px",
            padding: "10px",
            borderRadius: "16px",
            backgroundColor: "rgba(24, 24, 27, 0.7)",
            border: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "5px",
              borderRadius: "10px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QRCodeSVG
              value={`BELEZIA:${offerId}:${cleanPhoneNumber(customerPhone)}`}
              size={52}
              level="M"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#a1a1aa",
              lineHeight: "1.35",
            }}
          >
            <strong style={{ color: "#f4f4f5" }}>Show at Front Desk</strong> to redeem on 31st October.
            Present this voucher pass during checkout.
          </div>
        </div>

        {/* COMPACT TERMS */}
        <div
          style={{
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px solid #27272a",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "8.5px",
              color: "#71717a",
              lineHeight: "1.3",
              margin: 0,
            }}
          >
            {LOREAL_EVENT_TERMS}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTION BUTTONS: ONLY SAVE TO PHOTOS & DOWNLOAD JPG (ALL SHARE REMOVED) */}
      {/* ========================================================================= */}
      <div className="w-full mt-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. SHARE IMAGE ON OTHER APPS */}
          <button
            onClick={handleShareImage}
            disabled={isExporting}
            className="py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:brightness-110 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            title="Share voucher JPG image to other apps using iOS & Android Share"
          >
            <Share2 className="h-4 w-4" />
            <span>{isExporting ? "Sharing..." : "Share"}</span>
          </button>

          {/* 2. DOWNLOAD JPG */}
          <button
            onClick={handleDownloadJpg}
            disabled={isExporting}
            className="py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-98 text-zinc-200 font-extrabold text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            title="Download lightweight JPG image directly to device storage"
          >
            <Download className="h-4 w-4 text-amber-400" />
            <span>Download JPG</span>
          </button>
        </div>

        <p className="text-[10px] text-zinc-400 text-center font-medium">
          📸 Share voucher JPG image to other apps or download directly
        </p>

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
