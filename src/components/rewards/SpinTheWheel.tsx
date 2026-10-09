"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  Copy,
  User,
  Phone,
  ShieldAlert,
  FileDown,
  AlertTriangle,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";
import {
  RewardPrize,
  DEFAULT_PRIZES,
  SpinGameState,
  SpinClaimRecord,
  PrizeType,
} from "@/types/rewards";
import {
  playTickSound,
  playWinFanfare,
  getSoundMuted,
  setSoundMuted,
  initAudioContext,
} from "@/lib/audioEffects";
import {
  saveClaimRecord,
  getClaimRecords,
  syncClaimToServer,
  generateOfferToken,
  getOfferProductImage,
} from "@/lib/rewardStorage";
import { OfferVoucherCard } from "./OfferVoucherCard";
import {
  getSalonBookingWhatsAppUrl,
  LOREAL_EVENT_TERMS,
  cleanPhoneNumber,
} from "@/lib/whatsapp";

interface SpinTheWheelProps {
  onClose?: () => void;
  isModal?: boolean;
  initialToken?: string;
  initialName?: string;
  initialPhone?: string;
  isExternalLink?: boolean;
}

// Helper to wrap offer text into multiple lines without cutting or using ellipsis (...)
function splitTitleIntoLines(title: string): string[] {
  const clean = (title || "").trim();
  const lower = clean.toLowerCase();

  // Optimized line splits for the 5 official event offers
  if (lower.includes("shampoo")) {
    return ["Free L'Oréal", "Shampoo"];
  }
  if (lower.includes("facewash")) {
    return ["Free L'Oréal", "Facewash"];
  }
  if (lower.includes("d-tan") || lower.includes("de-tan")) {
    return ["Free D-Tan", "Service"];
  }
  if (lower.includes("hair cut") || lower.includes("haircut")) {
    return ["Free Hair Cut", "Service"];
  }
  if (lower.includes("mask") || lower.includes("repair")) {
    return ["Free L'Oréal", "Absolut Repair", "Hair Mask"];
  }

  // General fallback: wrap by word boundaries, never truncate with '...'
  if (clean.length <= 11) return [clean];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= 12) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function SpinTheWheel({
  onClose,
  isModal = false,
  initialToken = "",
  initialName = "",
  initialPhone = "",
  isExternalLink = false,
}: SpinTheWheelProps) {
  const {
    wheelInventory,
    checkPhoneHasClaimed,
    validateOfferToken,
    recordSpinLog,
  } = useApp();

  const [gameState, setGameState] = useState<SpinGameState>("IDLE");
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [winningPrize, setWinningPrize] = useState<RewardPrize | null>(null);
  const [claimCode, setClaimCode] = useState<string>("");
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Customer Form & Voucher State
  const [customerName, setCustomerName] = useState<string>(initialName);
  const [customerPhone, setCustomerPhone] = useState<string>(initialPhone);
  const [offerToken, setOfferToken] = useState<string>(initialToken);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Physics animation refs
  const animationFrameRef = useRef<number | null>(null);
  const lastTickAngleRef = useRef<number>(0);

  // Validate single-use link / token on mount
  useEffect(() => {
    if (initialToken) {
      setOfferToken(initialToken);
      validateOfferToken(initialToken).then((res) => {
        if (res.isRedeemed) {
          setIsTokenExpired(true);
          setTokenError(
            "⚠️ This invite link has already been used and redeemed! Unique links are single-use only. Contact Belezia Salon at +91-7290828680."
          );
        }
      });
    }
  }, [initialToken, validateOfferToken]);

  // For public links: restore won state if previously spun and sync local records to server
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Sync any pending local claims to central server
        const localClaims = getClaimRecords();
        localClaims.forEach((c) => {
          syncClaimToServer(c).catch(() => {});
        });

        // Restore won state if session exists
        const saved = sessionStorage.getItem("belezia_spin_won_state");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.winningPrize) {
            setWinningPrize(parsed.winningPrize);
            if (parsed.claimCode) setClaimCode(parsed.claimCode);
            if (parsed.customerName) setCustomerName(parsed.customerName);
            if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
            if (parsed.isFormSubmitted) setIsFormSubmitted(true);
            setGameState("VERIFIED_AND_REVEALED");

            // Also make sure session state is persisted to server
            if (parsed.claimCode) {
              const sessionClaim: SpinClaimRecord = {
                id: `claim-${Date.now()}`,
                claimCode: parsed.claimCode,
                prizeId: parsed.winningPrize.id,
                prizeLabel: parsed.winningPrize.label,
                prizeType: parsed.winningPrize.type,
                customerName: parsed.customerName || undefined,
                customerPhone: cleanPhoneNumber(parsed.customerPhone) || undefined,
                wasVerified: Boolean(parsed.isFormSubmitted),
                inventoryDeducted: false,
                createdAt: new Date().toISOString(),
              };
              saveClaimRecord(sessionClaim);
              syncClaimToServer(sessionClaim).catch(() => {});
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }, [isModal]);

  // Map dedicated wheelInventory items to prize slices if configured
  const prizes: RewardPrize[] = useMemo(() => {
    if (wheelInventory && wheelInventory.length > 0) {
      return wheelInventory.map((item) => ({
        id: item.id,
        label: item.title,
        shortLabel: item.title,
        type:
          item.category === "free_service"
            ? ("service" as PrizeType)
            : item.category === "gift"
            ? ("product_gift" as PrizeType)
            : ("discount_percent" as PrizeType),
        value: 0,
        color: item.color || "#8b5cf6",
        textColor: "#ffffff",
        iconName: item.category === "free_service" ? "Scissors" : item.category === "gift" ? "Gift" : "Tag",
        description: `${item.title} (${item.category.replace("_", " ")}) - Stock: ${item.quantity}`,
        requiresInventoryDeduction: false,
      }));
    }
    return DEFAULT_PRIZES;
  }, [wheelInventory]);

  const numSlices = prizes.length;
  const sliceAngle = 360 / numSlices;

  // Initialize mounted and mute state
  useEffect(() => {
    setMounted(true);
    setIsMutedState(getSoundMuted());
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setSoundMuted(next);
  };

  // Easing function: Ease-Out Quint
  const easeOutQuint = (t: number): number => {
    return 1 - Math.pow(1 - t, 5);
  };

  // Launch Spin (Screen 1 Action)
  const spinWheel = useCallback(async () => {
    if (gameState === "SPINNING") return;
    if (isTokenExpired) return;

    // Unlock Web Audio context on user gesture
    initAudioContext();

    setGameState("SPINNING");
    setPhoneError(null);

    // Pick in-stock active prize index if available, otherwise random
    const inStockIndices =
      wheelInventory && wheelInventory.length > 0
        ? wheelInventory
            .map((item, idx) => ({ idx, available: item.is_active && item.quantity > 0 }))
            .filter((i) => i.available)
            .map((i) => i.idx)
        : [];

    const targetIndex =
      inStockIndices.length > 0
        ? inStockIndices[Math.floor(Math.random() * inStockIndices.length)]
        : Math.floor(Math.random() * numSlices);

    const selectedPrize = prizes[targetIndex];
    setWinningPrize(selectedPrize);

    const sliceCenter = (targetIndex + 0.5) * sliceAngle;
    const targetRemainder = (360 - sliceCenter) % 360;

    const startRot = currentRotation;
    const fullSpins = 6 * 360; // 6 full revolutions
    const currentRemainder = startRot % 360;
    let delta = targetRemainder - currentRemainder;
    if (delta <= 0) {
      delta += 360;
    }
    const totalRotationTarget = startRot + fullSpins + delta;

    const duration = 4500; // 4.5 seconds
    const startTime = performance.now();
    lastTickAngleRef.current = startRot;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutQuint(progress);
      const currentRot = startRot + (totalRotationTarget - startRot) * eased;

      setCurrentRotation(currentRot);

      // Trigger flapper tick sound as pegs pass
      const angleSinceLastTick = currentRot - lastTickAngleRef.current;
      if (angleSinceLastTick >= sliceAngle) {
        const speedRatio = Math.max(0.4, 1 - progress);
        playTickSound(speedRatio);
        lastTickAngleRef.current = currentRot;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished! Direct transition to prize reveal & form screen
        setCurrentRotation(totalRotationTarget);
        setGameState("VERIFIED_AND_REVEALED");
        const newCode = offerToken || generateOfferToken();
        setClaimCode(newCode);

        // Immediate audit record saved to storage and centralized server
        const initialRecord: SpinClaimRecord = {
          id: `claim-${Date.now()}`,
          claimCode: newCode,
          prizeId: selectedPrize.id,
          prizeLabel: selectedPrize.label,
          prizeType: selectedPrize.type,
          customerName: customerName.trim() || undefined,
          customerPhone: cleanPhoneNumber(customerPhone) || undefined,
          wasVerified: false,
          inventoryDeducted: false,
          createdAt: new Date().toISOString(),
        };
        saveClaimRecord(initialRecord);
        syncClaimToServer(initialRecord).catch(() => {});

        // Immediate celebratory sound & confetti
        playWinFanfare();
        confetti({
          particleCount: 130,
          spread: 90,
          origin: { y: 0.55 },
          colors: ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ffffff"],
        });

        // For public links, lock in won state to sessionStorage so user cannot refresh to spin again
        if (!isModal && typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              "belezia_spin_won_state",
              JSON.stringify({
                winningPrize: selectedPrize,
                claimCode: newCode,
                customerName: customerName.trim(),
                customerPhone,
                isFormSubmitted: false,
              })
            );
          } catch {
            // ignore
          }
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [
    gameState,
    isTokenExpired,
    currentRotation,
    numSlices,
    sliceAngle,
    prizes,
    wheelInventory,
    offerToken,
  ]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Form Submission & Voucher Generation (Screen 2 Action)
  const handleGenerateAndDownloadVoucher = async () => {
    if (!customerName || !customerName.trim()) {
      setPhoneError("Please enter your full name to download your voucher.");
      return;
    }

    const cleanPhone = cleanPhoneNumber(customerPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit WhatsApp number to download your voucher.");
      return;
    }

    setIsSubmitting(true);
    try {
      const hasClaimed = await checkPhoneHasClaimed(cleanPhone);
      if (hasClaimed) {
        setPhoneError(
          `⚠️ This phone number (+91 ${cleanPhone}) has already claimed an offer for L'Oréal Professional Day! Each customer can only claim one offer.`
        );
        return;
      }

      setPhoneError(null);
      const finalOfferId = offerToken || claimCode || generateOfferToken();
      setClaimCode(finalOfferId);

      // Save claim record and audit log in spin_logs
      if (winningPrize) {
        const record: SpinClaimRecord = {
          id: `claim-${Date.now()}`,
          claimCode: finalOfferId,
          prizeId: winningPrize.id,
          prizeLabel: winningPrize.label,
          prizeType: winningPrize.type,
          customerName: customerName.trim() || undefined,
          customerPhone: cleanPhone,
          wasVerified: true,
          inventoryDeducted: false,
          createdAt: new Date().toISOString(),
        };
        saveClaimRecord(record);
        await syncClaimToServer(record).catch(() => {});

        await recordSpinLog({
          offer_token: finalOfferId,
          customer_name: customerName.trim() || "Valued Guest",
          phone_number: cleanPhone,
          won_item: winningPrize.label,
          prize_id: winningPrize.id,
          is_redeemed: true,
        });
      }

      setIsFormSubmitted(true);
      setShowVoucherModal(true);

      // Update sessionStorage with submitted status
      if (!isModal && typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "belezia_spin_won_state",
            JSON.stringify({
              winningPrize,
              claimCode: finalOfferId,
              customerName: customerName.trim(),
              customerPhone: cleanPhone,
              isFormSubmitted: true,
            })
          );
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("Error generating offer voucher:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (claimCode) {
      navigator.clipboard.writeText(claimCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // WhatsApp click-to-chat help option
  const handleShareWhatsApp = () => {
    if (!winningPrize || !claimCode) return;
    const cleanPhone = cleanPhoneNumber(customerPhone);
    const url = getSalonBookingWhatsAppUrl({
      customerName: customerName || "Valued Customer",
      customerPhone: cleanPhone,
      wonItem: winningPrize.label,
      offerId: claimCode,
      eventDate: "31st October (10 AM – 9 PM)",
      salonName: "Belezia Salon, Laxmi Nagar, Delhi",
    });
    window.open(url, "_blank");
  };

  // Reset to Screen 1
  const handleResetSpin = () => {
    setGameState("IDLE");
    setWinningPrize(null);
    setClaimCode("");
    setIsFormSubmitted(false);
    setShowVoucherModal(false);
    setPhoneError(null);
  };

  // Render SVG Slice paths for wheel
  const renderWheelSlices = () => {
    const radius = 200;
    const center = 200;

    return prizes.map((prize, index) => {
      const startDeg = index * sliceAngle;
      const endDeg = (index + 1) * sliceAngle;

      const startRad = ((startDeg - 90) * Math.PI) / 180;
      const endRad = ((endDeg - 90) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

      const textAngle = startDeg + sliceAngle / 2;
      const textRad = ((textAngle - 90) * Math.PI) / 180;

      // Dummy product image badge coordinates (at 75% radius)
      const imgRadius = radius * 0.75;
      const imgX = center + imgRadius * Math.cos(textRad);
      const imgY = center + imgRadius * Math.sin(textRad);
      const imgSize = 34;
      const productImgUrl = getOfferProductImage(prize.label || prize.shortLabel);

      // Multi-line text coordinates (at 48% radius)
      const textRadius = radius * 0.48;
      const textX = center + textRadius * Math.cos(textRad);
      const textY = center + textRadius * Math.sin(textRad);
      const lines = splitTitleIntoLines(prize.label || prize.shortLabel);

      return (
        <g key={prize.id} className="cursor-pointer">
          {/* Slice wedge */}
          <path
            d={pathData}
            fill={prize.color}
            stroke="#18181b"
            strokeWidth="2.5"
            className="transition-colors hover:brightness-110"
          />
          {/* Slice border highlight */}
          <path
            d={pathData}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />

          {/* Product image badge */}
          <g transform={`translate(${imgX - imgSize / 2}, ${imgY - imgSize / 2})`}>
            <defs>
              <clipPath id={`wheel-badge-clip-${prize.id}`}>
                <circle cx={imgSize / 2} cy={imgSize / 2} r={imgSize / 2 - 1.5} />
              </clipPath>
            </defs>
            <circle
              cx={imgSize / 2}
              cy={imgSize / 2}
              r={imgSize / 2}
              fill="#ffffff"
              stroke="#fbbf24"
              strokeWidth="2"
              className="drop-shadow-md"
            />
            <image
              href={productImgUrl}
              x={0}
              y={0}
              width={imgSize}
              height={imgSize}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#wheel-badge-clip-${prize.id})`}
            />
          </g>

          {/* Multi-line Offer Label */}
          <g
            transform={`translate(${textX}, ${textY}) rotate(${
              textAngle > 90 && textAngle < 270 ? textAngle + 180 : textAngle
            })`}
          >
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white font-extrabold select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              style={{
                fontSize: lines.length >= 3 ? "10px" : "11px",
                letterSpacing: "0.02em",
              }}
            >
              {lines.map((line, lIdx) => {
                const totalLines = lines.length;
                const lineHeight = lines.length >= 3 ? 12 : 13;
                const offset = (lIdx - (totalLines - 1) / 2) * lineHeight;
                return (
                  <tspan
                    key={lIdx}
                    x={0}
                    dy={lIdx === 0 ? offset : lineHeight}
                    className={lIdx === 0 ? "fill-amber-300 font-black" : "fill-white"}
                  >
                    {line}
                  </tspan>
                );
              })}
            </text>
          </g>

          {/* Golden perimeter peg */}
          <circle
            cx={x1}
            cy={y1}
            r="3.5"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1"
            className="filter drop-shadow-[0_0_2px_rgba(245,158,11,0.8)]"
          />
        </g>
      );
    });
  };

  const isVerifiedAndRevealed = gameState === "VERIFIED_AND_REVEALED";

  if (!mounted) {
    return (
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-6 select-none animate-pulse">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-purple-600/30 mb-4">
          <div className="h-full w-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-400 animate-spin" />
          </div>
        </div>
        <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full border-4 border-zinc-850 bg-zinc-900/60 flex items-center justify-center">
          <span className="text-xs font-mono text-zinc-500">Loading Lucky Wheel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-3 sm:p-6 select-none">
      {/* HEADER WITH SALON BRANDING & MUTE TOGGLE */}
      {isModal ? (
        <div className="w-full flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-purple-600/30 shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 animate-spin-slow" />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-base font-extrabold text-white tracking-tight leading-tight">
                  Belezia × L’Oréal Professionnel
                </h2>
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
            <a
              href="/spin"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              title="Open Fullscreen Tablet Kiosk Mode (/spin)"
            >
              <ExternalLink className="h-3 w-3 text-purple-400" />
              <span>Kiosk Mode</span>
            </a>
            <button
              onClick={handleToggleMute}
              aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-purple-400" />}
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                aria-label="Close Spin Wheel Modal"
                className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ON STANDALONE /SPIN PAGE: Sleek Title & Sound Control Bar */
        <div className="w-full flex items-center justify-between mb-2 sm:mb-4 px-1 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-amber-300 tracking-wide uppercase leading-tight">
              Spin The Lucky Wheel
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight">
              • Guaranteed L&apos;Oréal Professionnel Goodies
            </span>
          </div>

          <button
            onClick={handleToggleMute}
            aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-purple-400" />}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SCREEN 1: SPIN THE WHEEL */}
      {/* ========================================================================= */}
      <div className="relative flex flex-col items-center justify-center my-2 sm:my-4">
        {/* TOP POINTER / FLAPPER INDICATOR */}
        <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.6)]" />
          <div className="w-3 h-3 rounded-full bg-white -mt-7 border-2 border-amber-500 shadow-sm" />
        </div>

        {/* NEON OUTER GLOW RING */}
        <div
          className={`relative p-2.5 sm:p-3.5 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 shadow-2xl transition-transform duration-500 ${
            gameState === "SPINNING" ? "scale-102 shadow-purple-500/50" : "hover:scale-101"
          }`}
        >
          {/* WHEEL SVG */}
          <div className="relative w-[320px] h-[320px] sm:w-[410px] sm:h-[410px] rounded-full overflow-hidden bg-zinc-950 border-4 border-zinc-900 shadow-inner">
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full"
              style={{
                transform: `rotate(${currentRotation}deg)`,
                transformOrigin: "center center",
                willChange: "transform",
              }}
            >
              {renderWheelSlices()}
            </svg>

            {/* CENTER METALLIC SPIN HUB BUTTON */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              <button
                onClick={spinWheel}
                disabled={gameState === "SPINNING"}
                aria-label="Spin the wheel"
                className={`relative group flex flex-col items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all duration-300 cursor-pointer ${
                  gameState === "SPINNING"
                    ? "bg-zinc-900 cursor-not-allowed opacity-90 scale-95"
                    : "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:scale-105 active:scale-95"
                }`}
              >
                <div className="flex flex-col items-center justify-center">
                  <Sparkles
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      gameState === "SPINNING" ? "text-amber-400 animate-spin" : "text-zinc-950"
                    }`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-black tracking-wider uppercase ${
                      gameState === "SPINNING" ? "text-amber-300 text-[10px]" : "text-zinc-950"
                    }`}
                  >
                    {gameState === "SPINNING" ? "Spinning" : "SPIN"}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* SECURITY & TOKEN ALERTS */}
        {tokenError && (
          <div className="mt-3 max-w-md w-full p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg">
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{tokenError}</span>
          </div>
        )}

        {/* HELPER TEXT UNDER WHEEL */}
        <div className="mt-3 text-center">
          {gameState === "IDLE" && (
            <p className="text-xs text-zinc-400 animate-pulse">
              👉 Tap <span className="text-amber-400 font-bold">SPIN</span> to reveal your guaranteed reward!
            </p>
          )}
          {gameState === "SPINNING" && (
            <p className="text-xs text-purple-300 font-semibold animate-pulse">
              🎰 Revealing your L&apos;Oréal Day reward...
            </p>
          )}
        </div>
      </div>

      {/* L'OREAL PROFESSIONAL DAY CAMPAIGN BANNER / DETAIL DISCUSSION BOX BELOW WHEEL */}
      <div className="w-full mt-2 mb-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-zinc-900 to-pink-950/60 border border-amber-500/30 text-center space-y-1.5 shadow-lg">
        <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-extrabold text-amber-200">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>Belezia Salon is partnering with L’Oréal Professionnel to bring you an exclusive Hair Consultation Event!</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-300">
          <span className="text-pink-300 font-bold">🎁 Entry Bonus: Absolute Free L&apos;Oréal Goodie Bag for every consultation</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-emerald-300 font-semibold">💰 Entry &amp; Consult: 100% FREE</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-purple-300 font-medium">🔬 Micro-analysis &amp; Color Mapping by Corporate Experts</span>
        </div>
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[11px] font-semibold leading-relaxed flex items-center justify-center gap-1.5 text-left sm:text-center">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>{LOREAL_EVENT_TERMS}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SCREEN 2: WINNER FORM & OFFER VOUCHER DOWNLOAD PAGE */}
      {/* ========================================================================= */}
      {isVerifiedAndRevealed && winningPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl p-5 sm:p-7 overflow-hidden text-center space-y-4">
            {/* AMBIENT GRADIENT BLOB */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* CONGRATULATIONS BADGE */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>CONGRATULATIONS! YOU WON</span>
            </div>

            {/* WON PRIZE SHOWCASE */}
            <div
              className="p-5 rounded-2xl border text-center shadow-xl relative overflow-hidden"
              style={{
                backgroundColor: `${winningPrize.color}15`,
                borderColor: `${winningPrize.color}50`,
              }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-36 w-36 sm:h-44 sm:w-44 rounded-3xl flex items-center justify-center p-3 bg-white border-2 border-amber-500/50 shadow-2xl mb-2 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getOfferProductImage(winningPrize.label)}
                    alt={winningPrize.label}
                    className="h-full w-full object-contain filter drop-shadow-md"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {winningPrize.label}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-md">
                  {winningPrize.description}
                </p>
              </div>

              {/* MANDATORY DISCLAIMER */}
              <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] font-bold text-left flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{LOREAL_EVENT_TERMS}</span>
              </div>
            </div>

            {/* FORM TO FILL: NAME AND NUMBER */}
            {!isFormSubmitted ? (
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-left space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Enter Details to Download Voucher
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    1 Offer / Number
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1 font-bold">
                      Your Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setPhoneError(null);
                        }}
                        placeholder="e.g. Priya Sharma"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1 font-bold">
                      WhatsApp Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setPhoneError(null);
                        }}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {phoneError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    <span>{phoneError}</span>
                  </div>
                )}

                <button
                  onClick={handleGenerateAndDownloadVoucher}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 hover:brightness-110 active:scale-98 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  <span>
                    {isSubmitting ? "Generating Voucher..." : "Download Voucher Image (.jpg)"}
                  </span>
                </button>
              </div>
            ) : (
              /* ALREADY SUBMITTED: FRONT DESK OFFER ID & RE-DOWNLOAD BUTTON */
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2 max-w-sm mx-auto">
                  <div className="text-left">
                    <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">
                      Front Desk Offer ID
                    </div>
                    <div className="text-base sm:text-lg font-mono font-black text-amber-400 tracking-wider">
                      {claimCode}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowVoucherModal(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 hover:brightness-110 active:scale-98 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Download Voucher Image (.jpg)</span>
                </button>
              </div>
            )}

            {/* IN-STORE POS MODAL ACTIONS ONLY */}
            {isModal && (
              <div className="pt-1">
                <button
                  onClick={handleResetSpin}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-purple-400" />
                  <span>Spin Again</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DOWNLOADABLE SHAREABLE OFFER VOUCHER CARD MODAL */}
      {/* ========================================================================= */}
      {showVoucherModal && winningPrize && (
        <OfferVoucherCard
          showModalWrapper={true}
          onClose={() => setShowVoucherModal(false)}
          customerName={customerName || "Valued Guest"}
          customerPhone={customerPhone}
          wonItem={winningPrize.label}
          offerId={claimCode || offerToken || "BZ-LOREAL-OFFER"}
          eventDate="31st October"
          eventTime="10:00 AM – 9:00 PM"
          salonName="Belezia Salon"
          salonAddress="Laxmi Nagar, Delhi"
        />
      )}
    </div>
  );
}
