"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Sparkles,
  ExternalLink,
  Check,
  Copy,
  Calendar,
  Phone,
  MessageCircle,
  MapPin,
  Heart,
  Gift,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
} from "lucide-react";
import { OfferVoucherCard } from "./OfferVoucherCard";
import { checkPhoneHasClaimedServer } from "@/lib/rewardStorage";
import { cleanPhoneNumber, SALON_BOOKING_WHATSAPP } from "@/lib/whatsapp";
import { removeProductQuantity } from "@/types/rewards";

export const INSTAGRAM_URL = "https://www.instagram.com/beleziasalonlaxminagar/";
export const INSTAGRAM_HANDLE = "@beleziasalonlaxminagar";
export const SALON_PHONE_DISPLAY = "+91 7290828680";
export const SALON_WHATSAPP_CLEAN = "917290828680";
export const SALON_ADDRESS = "Belezia Salon, Laxmi Nagar, Delhi";

interface EventConcludedViewProps {
  initialPhone?: string;
  initialToken?: string;
  initialName?: string;
}

export function EventConcludedView({
  initialPhone = "",
  initialToken = "",
  initialName = "",
}: EventConcludedViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);

  // Voucher lookup state for attendees who won on Oct 31
  const [showVoucherLookup, setShowVoucherLookup] = useState(false);
  const [searchPhone, setSearchPhone] = useState(initialPhone);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [foundClaim, setFoundClaim] = useState<{
    customerName: string;
    customerPhone: string;
    prizeLabel: string;
    claimCode: string;
  } | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // Trigger celebration confetti on mount
  useEffect(() => {
    try {
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#fbbf24", "#d946ef"];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors,
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch {
      // ignore
    }
  }, []);

  // Auto-check voucher if initialPhone was provided or stored in session
  useEffect(() => {
    // 1. Check session storage for current browser claim
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("belezia_spin_won_state");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.claimCode && parsed.winningPrize) {
            setFoundClaim({
              customerName: parsed.customerName || initialName || "Valued Guest",
              customerPhone: parsed.customerPhone || initialPhone || "",
              prizeLabel: removeProductQuantity(parsed.winningPrize.label || "Exclusive Salon Offer"),
              claimCode: parsed.claimCode,
            });
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Check phone parameter
    if (initialPhone) {
      const clean = cleanPhoneNumber(initialPhone);
      if (clean && clean.length === 10) {
        checkPhoneHasClaimedServer(clean).then((res) => {
          if (res.hasClaimed && res.claim) {
            setFoundClaim({
              customerName: res.claim.customerName || initialName || "Valued Guest",
              customerPhone: res.claim.customerPhone || clean,
              prizeLabel: removeProductQuantity(res.claim.prizeLabel || "Exclusive Salon Offer"),
              claimCode: res.claim.claimCode,
            });
          }
        });
      }
    }
  }, [initialPhone, initialName]);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(INSTAGRAM_URL);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyHandle = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(INSTAGRAM_HANDLE);
      setCopiedHandle(true);
      setTimeout(() => setCopiedHandle(false), 2500);
    }
  };

  const handleSearchVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const clean = cleanPhoneNumber(searchPhone);
    if (!clean || clean.length !== 10) {
      setLookupError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSearching(true);
    try {
      const res = await checkPhoneHasClaimedServer(clean);
      if (res.hasClaimed && res.claim) {
        setFoundClaim({
          customerName: res.claim.customerName || "Valued Guest",
          customerPhone: res.claim.customerPhone || clean,
          prizeLabel: removeProductQuantity(res.claim.prizeLabel || "Exclusive Salon Offer"),
          claimCode: res.claim.claimCode,
        });
        setShowVoucherModal(true);
      } else {
        setLookupError(
          `No voucher record found for +91 ${clean}. If you spun the wheel, please contact Belezia Salon at ${SALON_PHONE_DISPLAY}.`
        );
      }
    } catch {
      setLookupError("Failed to check voucher. Please check your connection or contact the salon directly.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-white selection:bg-pink-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER / BRAND BADGE */}
      {/* ========================================================================= */}
      <div className="w-full text-center space-y-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider shadow-sm animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Event Concluded • L&apos;Oréal Professionnel Day</span>
        </div>

        <div className="space-y-1">
          <h2 className="text-xs sm:text-sm font-black tracking-widest text-zinc-400 uppercase">
            Belezia Salon &amp; Spa × L&apos;Oréal Professionnel
          </h2>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-purple-400 leading-tight">
            The Event Was Great!
          </h1>
          <p className="text-base sm:text-xl font-bold text-zinc-200">
            Thank you for making it a massive success! 🎉
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN GRATITUDE & HIGHLIGHTS CARD */}
      {/* ========================================================================= */}
      <div className="w-full rounded-2xl sm:rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Gratitude Letter */}
        <div className="relative text-center max-w-2xl mx-auto space-y-3">
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            Our exclusive{" "}
            <span className="text-white font-bold">
              L&apos;Oréal Professionnel Hair Consultation &amp; Lucky Wheel Event
            </span>{" "}
            has officially ended. We are overwhelmed and deeply grateful for the incredible
            love, energy, and smiles brought by all our wonderful clients and guests to{" "}
            <span className="text-amber-300 font-bold">Belezia Salon, Laxmi Nagar</span>.
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            From expert scalp analyses and personalised hair color mapping to exciting wheel spins
            and goodie giveaways, you made every moment unforgettable!
          </p>
        </div>

        {/* Event Impact Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xl sm:text-2xl font-black text-amber-400">100+</div>
            <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">Hair Consults</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xl sm:text-2xl font-black text-pink-400">100%</div>
            <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">Free Goodies</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xl sm:text-2xl font-black text-purple-400">Lucky</div>
            <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">Wheel Rewards</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">Infinite</div>
            <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">Happy Smiles</div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. FUTURE EVENTS TEASER & ANNOUNCEMENT */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/50 via-zinc-950/80 to-pink-950/50 border border-purple-500/40 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wide">
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
            <span>More Events Coming Soon</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            We Will Launch More Such Exciting Events in the Future!
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
            Missed this event? Don&apos;t worry! We are already preparing upcoming beauty days,
            special discounts, luxury hair pampering sessions, and interactive lucky draws.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 4. INSTAGRAM SPOTLIGHT & QR CODE (PRIMARY CTA) */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-7 rounded-2xl bg-zinc-950 border-2 border-pink-500/30 text-center space-y-5 shadow-xl">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-pink-400 uppercase tracking-wider">
              <span>Stay In The Loop</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-white">
              Follow Us on Instagram for More Updates &amp; Future Events
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
              Follow our official page to get first access to event dates, hair transformations,
              exclusive follower-only perks, and flash offers!
            </p>
          </div>

          {/* INSTAGRAM QR CODE CONTAINER */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-pink-500/40 hover:scale-102 transition-transform duration-300 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/instagram-qr.png"
                alt="Belezia Salon Laxmi Nagar Instagram QR Code"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
              <span className="text-pink-400 font-extrabold text-sm">{INSTAGRAM_HANDLE}</span>
              <button
                onClick={handleCopyHandle}
                className="p-1 hover:text-white text-zinc-400 transition-colors"
                title="Copy Handle"
              >
                {copiedHandle ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Scan the QR code with your phone camera or click the button below to follow:
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:from-[#f09433]/90 hover:via-[#dc2743]/90 hover:to-[#bc1888]/90 text-white font-black text-sm shadow-lg shadow-pink-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              {/* Instagram SVG Icon */}
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span>Follow @beleziasalonlaxminagar</span>
              <ExternalLink className="h-4 w-4 opacity-70 ml-1" />
            </a>

            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-zinc-400" />
                  <span>Copy Profile Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. VOUCHER LOOKUP (FOR ATTENDEES WHO WON ON OCT 31) */}
        {/* ========================================================================= */}
        <div className="pt-2 border-t border-zinc-800/80">
          <button
            onClick={() => setShowVoucherLookup(!showVoucherLookup)}
            className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Gift className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">
                  Already claimed a voucher on October 31st?
                </div>
                <div className="text-[11px] text-zinc-400">
                  {foundClaim
                    ? `Found saved voucher: "${foundClaim.prizeLabel}" (${foundClaim.claimCode})`
                    : "Check or retrieve your saved offer voucher"}
                </div>
              </div>
            </div>
            <div className="text-zinc-400">
              {showVoucherLookup ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {showVoucherLookup && (
            <div className="mt-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
              {foundClaim ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="text-xs font-bold text-emerald-300">
                      🎉 Active Voucher for {foundClaim.customerName}
                    </div>
                    <div className="text-xs text-white font-medium">
                      {foundClaim.prizeLabel}{" "}
                      <span className="font-mono text-zinc-400">({foundClaim.claimCode})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowVoucherModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
                  >
                    View &amp; Show Voucher Card
                  </button>
                </div>
              ) : null}

              <form onSubmit={handleSearchVoucher} className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Enter your registered 10-digit mobile number:
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isSearching ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    <span>{isSearching ? "Searching..." : "Find"}</span>
                  </button>
                </div>
                {lookupError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{lookupError}</span>
                  </p>
                )}
              </form>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 6. SALON LOCATION & QUICK CONTACT */}
        {/* ========================================================================= */}
        <div className="pt-4 border-t border-zinc-800 text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-pink-400" />
              <span>{SALON_ADDRESS}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-emerald-400" />
              <span>{SALON_PHONE_DISPLAY}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <a
              href={`https://wa.me/${SALON_WHATSAPP_CLEAN}?text=${encodeURIComponent(
                "Hello Belezia Salon! I attended the L'Oréal Consultation Event and would like to stay in touch for upcoming events!"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp Salon</span>
            </a>
            <a
              href="tel:+917290828680"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Call Reception</span>
            </a>
          </div>

          <p className="text-[11px] text-zinc-500 pt-2 flex items-center justify-center gap-1">
            <span>Crafted with</span>
            <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />
            <span>by Belezia Salon &amp; Spa</span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. VOUCHER MODAL (IF REVEALED) */}
      {/* ========================================================================= */}
      {showVoucherModal && foundClaim && (
        <OfferVoucherCard
          customerName={foundClaim.customerName}
          customerPhone={foundClaim.customerPhone}
          wonItem={foundClaim.prizeLabel}
          offerId={foundClaim.claimCode}
          onClose={() => setShowVoucherModal(false)}
          showModalWrapper={true}
        />
      )}
    </div>
  );
}
