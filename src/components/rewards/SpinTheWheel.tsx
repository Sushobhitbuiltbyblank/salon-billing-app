"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Percent,
  Droplet,
  Gift,
  Package,
  Tag,
  Scissors,
  Crown,
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  Share2,
  Copy,
  ChevronRight,
  ShoppingBag,
  Star,
  QrCode,
  ArrowRight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";
import {
  RewardPrize,
  DEFAULT_PRIZES,
  SpinGameState,
  SpinClaimRecord,
} from "@/types/rewards";
import {
  playTickSound,
  playWinFanfare,
  playUnlockSound,
  getSoundMuted,
  setSoundMuted,
  initAudioContext,
} from "@/lib/audioEffects";
import { generateClaimCode, saveClaimRecord } from "@/lib/rewardStorage";

interface SpinTheWheelProps {
  onClose?: () => void;
  isModal?: boolean;
}

export function SpinTheWheel({ onClose, isModal = false }: SpinTheWheelProps) {
  const { settings, catalog, saveCatalogItem, addDraftItem, draftItems } = useApp();

  const [gameState, setGameState] = useState<SpinGameState>("IDLE");
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [winningPrize, setWinningPrize] = useState<RewardPrize | null>(null);
  const [claimCode, setClaimCode] = useState<string>("");
  const [isMuted, setIsMutedState] = useState<boolean>(false);

  // Verification Gate Steps
  const [googleRated, setGoogleRated] = useState<boolean>(false);
  const [instaFollowed, setInstaFollowed] = useState<boolean>(false);
  const [wasSkipped, setWasSkipped] = useState<boolean>(false);

  // Front Desk Claim state
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [stockDeductedMessage, setStockDeductedMessage] = useState<string | null>(null);

  // Physics animation refs
  const animationFrameRef = useRef<number | null>(null);
  const lastTickAngleRef = useRef<number>(0);

  const prizes: RewardPrize[] = DEFAULT_PRIZES;
  const numSlices = prizes.length;
  const sliceAngle = 360 / numSlices;

  // Initialize mute state
  useEffect(() => {
    setIsMutedState(getSoundMuted());
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setSoundMuted(next);
  };

  // Easing function: Ease-Out Quint (super realistic fast spin then gradual deceleration)
  const easeOutQuint = (t: number): number => {
    return 1 - Math.pow(1 - t, 5);
  };

  // Launch Spin
  const spinWheel = useCallback(() => {
    if (gameState === "SPINNING") return;

    // Unlock Web Audio context on user gesture
    initAudioContext();

    setGameState("SPINNING");
    setGoogleRated(false);
    setInstaFollowed(false);
    setWasSkipped(false);
    setIsClaimed(false);
    setStockDeductedMessage(null);

    // Pick random prize index
    const targetIndex = Math.floor(Math.random() * numSlices);
    const selectedPrize = prizes[targetIndex];
    setWinningPrize(selectedPrize);

    // Calculate rotation:
    // To land targetIndex under top pointer (0 deg / 12 o'clock):
    // Slice i spans from i*sliceAngle to (i+1)*sliceAngle.
    // Center of slice i is (i + 0.5) * sliceAngle.
    // Normalized rotation needed is (360 - centerOfSlice) % 360.
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
        // Pitch decreases as wheel decelerates
        const speedRatio = Math.max(0.4, 1 - progress);
        playTickSound(speedRatio);
        lastTickAngleRef.current = currentRot;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished! Land on prize.
        setCurrentRotation(totalRotationTarget);
        setGameState("WON_PENDING_VERIFICATION");
        const newCode = generateClaimCode();
        setClaimCode(newCode);

        // Immediate celebratory initial win cue
        playWinFanfare();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [gameState, currentRotation, numSlices, sliceAngle, prizes]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Unlock and Reveal Prize
  const handleRevealPrize = (skipped = false) => {
    setWasSkipped(skipped);
    setGameState("VERIFIED_AND_REVEALED");
    playUnlockSound();

    // Secondary victory fanfare and confetti celebration
    setTimeout(() => {
      playWinFanfare();
      // Confetti burst
      confetti({
        particleCount: 130,
        spread: 90,
        origin: { y: 0.55 },
        colors: ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ffffff"],
      });
    }, 150);

    // Save claim record
    if (winningPrize) {
      const record: SpinClaimRecord = {
        id: `claim-${Date.now()}`,
        claimCode: claimCode || generateClaimCode(),
        prizeId: winningPrize.id,
        prizeLabel: winningPrize.label,
        prizeType: winningPrize.type,
        wasVerified: !skipped,
        inventoryDeducted: false,
        createdAt: new Date().toISOString(),
      };
      saveClaimRecord(record);
    }
  };

  // Check if both steps completed
  useEffect(() => {
    if (gameState === "WON_PENDING_VERIFICATION" && googleRated && instaFollowed) {
      handleRevealPrize(false);
    }
  }, [googleRated, instaFollowed, gameState]);

  // Front Desk Claim & Inventory Stock Deduct
  const handleClaimReward = async () => {
    if (!winningPrize || isClaimed) return;

    let stockMsg = "Reward successfully claimed!";

    // If prize is a physical product / gift, decrement stock in Supabase catalog
    if (winningPrize.requiresInventoryDeduction || winningPrize.type === "product_gift") {
      // Find matching or relevant retail product in catalog
      const matchedProduct = catalog.find(
        (c) =>
          c.type === "product" &&
          (c.name.toLowerCase().includes("serum") ||
            c.name.toLowerCase().includes("cream") ||
            c.name.toLowerCase().includes("product") ||
            (c.stock_qty !== undefined && c.stock_qty > 0))
      );

      if (matchedProduct) {
        const updatedQty = Math.max(0, (matchedProduct.stock_qty ?? 10) - 1);
        await saveCatalogItem({
          ...matchedProduct,
          stock_qty: updatedQty,
        });
        stockMsg = `✅ 1x "${matchedProduct.name}" claimed. Remaining Stock: ${updatedQty} (Synced to Supabase)`;
      } else {
        stockMsg = "✅ Reward claimed & recorded in salon database.";
      }
    }

    setIsClaimed(true);
    setStockDeductedMessage(stockMsg);

    // Update claim record in local storage
    const record: SpinClaimRecord = {
      id: `claim-${Date.now()}`,
      claimCode,
      prizeId: winningPrize.id,
      prizeLabel: winningPrize.label,
      prizeType: winningPrize.type,
      wasVerified: !wasSkipped,
      inventoryDeducted: true,
      createdAt: new Date().toISOString(),
    };
    saveClaimRecord(record);
  };

  // Apply discount or complimentary service directly to POS draft
  const handleApplyToPOS = () => {
    if (!winningPrize) return;

    if (winningPrize.type === "service") {
      // Find matching service in catalog
      const service = catalog.find(
        (c) =>
          c.type === "service" &&
          (c.name.toLowerCase().includes("detan") ||
            c.name.toLowerCase().includes("spa") ||
            c.name.toLowerCase().includes("shave"))
      );
      if (service) {
        addDraftItem({
          ...service,
          price: 0, // Complimentary 100% discount
        });
        setStockDeductedMessage(`Applied complimentary "${service.name}" (₹0) to active POS draft!`);
      } else {
        setStockDeductedMessage(`Please add the service to bill with 100% discount using claim code: ${claimCode}`);
      }
    } else if (winningPrize.type === "discount_percent" || winningPrize.type === "discount_flat") {
      setStockDeductedMessage(
        `Applied ${winningPrize.value}${winningPrize.type === "discount_percent" ? "%" : "₹"} discount code: ${claimCode}`
      );
    }
    setIsClaimed(true);
  };

  const handleCopyCode = () => {
    if (claimCode) {
      navigator.clipboard.writeText(claimCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (!winningPrize || !claimCode) return;
    const text = encodeURIComponent(
      `🎉 Congratulations! You won *${winningPrize.label}* at Belezia Salon Laxmi Nagar!\n\n` +
      `🎟️ Claim Code: *${claimCode}*\n` +
      `📌 Valid on your next salon visit.\n` +
      `📍 Shop 14-16, Main Market, Laxmi Nagar, New Delhi\n` +
      `📞 +91 98765 43210\n\nThank you for choosing Belezia Salon! ✨`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleResetSpin = () => {
    setGameState("IDLE");
    setWinningPrize(null);
    setClaimCode("");
    setGoogleRated(false);
    setInstaFollowed(false);
    setWasSkipped(false);
    setIsClaimed(false);
    setStockDeductedMessage(null);
  };

  // Render SVG Slice paths for wheel
  const renderWheelSlices = () => {
    const radius = 200;
    const center = 200;

    return prizes.map((prize, index) => {
      const startDeg = index * sliceAngle;
      const endDeg = (index + 1) * sliceAngle;

      // Polar to cartesian (offset by -90 so 0 deg starts at top center)
      const startRad = ((startDeg - 90) * Math.PI) / 180;
      const endRad = ((endDeg - 90) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

      // Text rotation angle
      const textAngle = startDeg + sliceAngle / 2;
      const textRad = ((textAngle - 90) * Math.PI) / 180;
      const textX = center + radius * 0.65 * Math.cos(textRad);
      const textY = center + radius * 0.65 * Math.sin(textRad);

      // Icon coords
      const iconX = center + radius * 0.85 * Math.cos(textRad);
      const iconY = center + radius * 0.85 * Math.sin(textRad);

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
          <line
            x1={center}
            y1={center}
            x2={x1}
            y2={y1}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
          />

          {/* Peg on outer rim */}
          <circle
            cx={x1}
            cy={y1}
            r="3.5"
            fill="#fbbf24"
            stroke="#78350f"
            strokeWidth="1"
          />

          {/* Label Text */}
          <text
            x={textX}
            y={textY}
            fill={prize.textColor || "#ffffff"}
            fontSize="12.5"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textAngle}, ${textX}, ${textY})`}
            className="select-none tracking-tight font-sans drop-shadow-md"
          >
            {prize.shortLabel}
          </text>
        </g>
      );
    });
  };

  const isPendingVerification = gameState === "WON_PENDING_VERIFICATION";
  const isVerifiedAndRevealed = gameState === "VERIFIED_AND_REVEALED";

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-3 sm:p-6 select-none">
      {/* HEADER WITH SALON BRANDING & MUTE TOGGLE */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-purple-600/30">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
              <Sparkles className="h-4 w-4 text-amber-400 animate-spin-slow" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Belezia Lucky Wheel</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-amber-300 border border-amber-500/30">
                VIP Rewards
              </span>
            </h2>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Spin to unlock exclusive salon services, discounts, and luxury gifts!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* MUTE / UNMUTE BUTTON */}
          <button
            onClick={handleToggleMute}
            aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-purple-400" />}
          </button>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* WHEEL CONTAINER */}
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

        {/* HELPER TEXT UNDER WHEEL */}
        <div className="mt-4 text-center">
          {gameState === "IDLE" && (
            <p className="text-xs text-zinc-400 animate-pulse">
              👉 Tap <span className="text-amber-400 font-bold">SPIN</span> to try your luck today!
            </p>
          )}
          {gameState === "SPINNING" && (
            <p className="text-xs text-purple-300 font-semibold animate-pulse">
              🎰 Good luck! Wheel is spinning...
            </p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BACKGROUND BLUR & VERIFICATION GATE OVERLAY */}
      {/* ========================================================================= */}
      {(isPendingVerification || isVerifiedAndRevealed) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl p-5 sm:p-7 overflow-hidden text-center">
            {/* AMBIENT GRADIENT BLOB */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* STAGE A: WON PENDING VERIFICATION (THE GATE) */}
            {isPendingVerification && (
              <div className="space-y-4">
                {/* MYSTERY LOCKED PRIZE CARD */}
                <div className="relative overflow-hidden p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/30 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-amber-500/10 to-pink-600/10 animate-pulse" />
                  <div className="relative flex flex-col items-center justify-center gap-1.5">
                    <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner animate-bounce">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                      <span>Prize Won!</span>
                      <span className="blur-sm select-none font-mono text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded">
                        ██████████
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 max-w-sm">
                      Complete 2 quick steps below to unlock and reveal your mystery salon prize!
                    </p>
                  </div>
                </div>

                {/* VERIFICATION STEPS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {/* STEP 1: GOOGLE REVIEWS */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all ${
                      googleRated
                        ? "bg-emerald-950/30 border-emerald-500/40"
                        : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-white">1. Google Review</span>
                      </div>
                      {googleRated && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>

                    <div className="flex flex-col items-center bg-zinc-950/80 p-2 rounded-xl border border-zinc-800/80 mb-2">
                      <QRCodeSVG
                        value={settings.google_review_url || "https://g.page/r/CbGd_cwnL9zrEBM/review"}
                        size={84}
                        level="M"
                        className="rounded"
                      />
                      <span className="text-[10px] text-zinc-400 mt-1 font-mono">Scan to Rate Us</span>
                    </div>

                    <div className="space-y-1.5">
                      <a
                        href={settings.google_review_url || "https://g.page/r/CbGd_cwnL9zrEBM/review"}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors"
                      >
                        <span>Open Review Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => setGoogleRated(!googleRated)}
                        className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          googleRated
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
                        }`}
                      >
                        {googleRated ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Rated & Verified</span>
                          </>
                        ) : (
                          <span>I Left a Review ✓</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* STEP 2: INSTAGRAM */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all ${
                      instaFollowed
                        ? "bg-emerald-950/30 border-emerald-500/40"
                        : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <InstagramIcon className="h-4 w-4 text-pink-400" />
                        <span className="text-xs font-bold text-white">2. Instagram Follow</span>
                      </div>
                      {instaFollowed && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>

                    <div className="flex flex-col items-center bg-zinc-950/80 p-2 rounded-xl border border-zinc-800/80 mb-2">
                      <QRCodeSVG
                        value={
                          settings.instagram_url ||
                          "https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr"
                        }
                        size={84}
                        level="M"
                        className="rounded"
                      />
                      <span className="text-[10px] text-zinc-400 mt-1 font-mono">@BeleziaSalon</span>
                    </div>

                    <div className="space-y-1.5">
                      <a
                        href={
                          settings.instagram_url ||
                          "https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors"
                      >
                        <span>Open Instagram</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => setInstaFollowed(!instaFollowed)}
                        className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          instaFollowed
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30"
                        }`}
                      >
                        {instaFollowed ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Followed & Verified</span>
                          </>
                        ) : (
                          <span>I Followed ✓</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ACTIONS: UNLOCK (IF BOTH COMPLETE) & CLEAR SKIP BUTTON */}
                <div className="pt-2 flex flex-col gap-2">
                  {googleRated && instaFollowed ? (
                    <button
                      onClick={() => handleRevealPrize(false)}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/30 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Unlock className="h-4 w-4" />
                      <span>Unlock My Reward Now!</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRevealPrize(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Skip Verification & Claim Prize Directly</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STAGE B: VERIFIED AND REVEALED (THE REVEAL) */}
            {isVerifiedAndRevealed && winningPrize && (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                {/* UNMASKED CELEBRATION BADGE */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold tracking-wide">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>{wasSkipped ? "REWARD UNLOCKED" : "VERIFIED & UNLOCKED"}</span>
                </div>

                {/* REVEALED PRIZE SHOWCASE */}
                <div
                  className="p-5 rounded-2xl border text-center shadow-xl relative overflow-hidden"
                  style={{
                    backgroundColor: `${winningPrize.color}15`,
                    borderColor: `${winningPrize.color}50`,
                  }}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-1"
                      style={{ backgroundColor: winningPrize.color }}
                    >
                      <Gift className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {winningPrize.label}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300 max-w-md">
                      {winningPrize.description}
                    </p>
                  </div>

                  {/* CLAIM CODE BOX */}
                  <div className="mt-4 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-2 max-w-xs mx-auto">
                    <div className="text-left">
                      <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">
                        Front Desk Claim Code
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
                </div>

                {/* STOCK / CLAIM STATUS NOTIFICATION */}
                {stockDeductedMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-left">
                    {stockDeductedMessage}
                  </div>
                )}

                {/* FRONT DESK ACTIONS */}
                <div className="space-y-2 pt-1">
                  {!isClaimed ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={handleClaimReward}
                        className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        <span>Claim & Deduct Stock</span>
                      </button>

                      <button
                        onClick={handleApplyToPOS}
                        className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="h-4 w-4 text-amber-400" />
                        <span>Apply to Current POS Cart</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-2 px-3 rounded-xl bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Prize Marked Claimed by Reception Desk</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleShareWhatsApp}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>WhatsApp Reward</span>
                    </button>

                    <button
                      onClick={handleResetSpin}
                      className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-purple-400" />
                      <span>Spin Again</span>
                    </button>
                  </div>
                </div>

                {isModal && onClose && (
                  <div className="pt-2">
                    <button
                      onClick={onClose}
                      className="w-full py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Done & Return to Billing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
