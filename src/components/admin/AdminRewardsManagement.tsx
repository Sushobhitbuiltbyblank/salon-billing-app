"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { SpinClaimRecord } from "@/types/rewards";
import { getClaimRecords, getLocalSpinLogs, fetchServerClaimRecords } from "@/lib/rewardStorage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import {
  Sparkles,
  Gift,
  Save,
  CheckCircle2,
  Search,
  ExternalLink,
  Layers,
  Star,
  QrCode,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  User,
  Phone,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  FileDown,
  MessageCircle,
  ShoppingBag,
  RotateCcw,
  ArrowRight,
  ClipboardPaste,
  Trash2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { WheelInventoryManager } from "./WheelInventoryManager";
import { OfferVoucherCard } from "@/components/rewards/OfferVoucherCard";
import {
  LOREAL_EVENT_TERMS,
  SALON_BOOKING_WHATSAPP,
  cleanPhoneNumber,
  getSalonBookingWhatsAppUrl,
} from "@/lib/whatsapp";

interface VerificationDetails {
  id: string;
  offerToken: string;
  customerName: string;
  phoneNumber: string;
  wonItem: string;
  prizeId?: string;
  isRedeemed: boolean;
  redeemedAt?: string;
  createdAt: string;
  eventDate: string;
  terms: string;
  venue: string;
}

export function AdminRewardsManagement() {
  const {
    settings,
    updateSettings,
    setIsSpinWheelOpen,
    wheelInventory,
    verifyOfferById,
    catalog,
    addDraftItem,
    deleteClaimRecord,
    clearAllClaimRecords,
  } = useApp();

  const [claimLogs, setClaimLogs] = useState<SpinClaimRecord[]>(() => getClaimRecords());
  const [activeSubTab, setActiveSubTab] = useState<"verify" | "pool" | "claims" | "gate">("verify");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchLog, setSearchLog] = useState("");

  // Verification Input & Result State
  const [inputOfferId, setInputOfferId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    attempted: boolean;
    isValid: boolean;
    offerDetails: VerificationDetails | null;
    error?: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<VerificationDetails | null>(
    null
  );

  // Verification Gate URLs
  const [reviewUrl, setReviewUrl] = useState(settings.google_review_url || "");
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url || "");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [isLoadingClaims, setIsLoadingClaims] = useState(false);

  const refreshClaims = async (showLoadingState = false) => {
    if (showLoadingState) setIsLoadingClaims(true);
    try {
      const records = await fetchServerClaimRecords();
      setClaimLogs(records);
    } catch (err) {
      console.warn("Failed to refresh claims:", err);
    } finally {
      if (showLoadingState) setIsLoadingClaims(false);
    }
  };

  // Load latest claims on mount
  useEffect(() => {
    refreshClaims();
    setReviewUrl(settings.google_review_url || "");
    setInstagramUrl(settings.instagram_url || "");
  }, [settings]);

  // Auto-refresh claims when viewing the "claims" tab or when window gets focus
  useEffect(() => {
    if (activeSubTab === "claims") {
      refreshClaims();
      const interval = setInterval(() => {
        refreshClaims();
      }, 4000);
      const onFocus = () => refreshClaims();
      window.addEventListener("focus", onFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", onFocus);
      };
    }
  }, [activeSubTab]);

  // Delete single claim record
  const handleDeleteClaim = async (claim: SpinClaimRecord) => {
    if (!confirm(`Are you sure you want to delete claim record "${claim.claimCode}" (${claim.customerName || "Customer"})?`)) {
      return;
    }
    await deleteClaimRecord(claim.id, claim.claimCode, claim.customerPhone);
    setClaimLogs((prev) => prev.filter((c) => c.id !== claim.id && c.claimCode !== claim.claimCode));
    refreshClaims();
    showToast("🗑️ Claim record deleted successfully!");
  };

  // Delete all dummy/test claims in history
  const handleClearAllClaims = async () => {
    if (!confirm("⚠️ Are you sure you want to DELETE ALL dummy claim records in history?\n\nThis will clear all test claims from server, local storage and Supabase, and release all test phone numbers so they can spin again.")) {
      return;
    }
    await clearAllClaimRecords();
    setClaimLogs([]);
    refreshClaims();
    showToast("🗑️ All claim history records deleted successfully!");
  };

  // Handle Offer Verification by Unique ID
  const handleVerifyOffer = async (idToVerify?: string) => {
    const targetId = (idToVerify || inputOfferId).trim();
    if (!targetId) {
      showToast("Please enter a Unique Offer ID to verify");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOfferById(targetId);
      if (result.isValid && result.offerDetails) {
        setVerificationResult({
          attempted: true,
          isValid: true,
          offerDetails: result.offerDetails,
        });
        showToast("✅ Offer successfully verified!");
      } else {
        setVerificationResult({
          attempted: true,
          isValid: false,
          offerDetails: null,
          error:
            result.error ||
            `No matching offer found with Unique ID "${targetId}". Check ID or confirm customer completed spin.`,
        });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setVerificationResult({
        attempted: true,
        isValid: false,
        offerDetails: null,
        error: "An error occurred while verifying the offer. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Quick Paste from Clipboard
  const handlePasteOfferId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setInputOfferId(text.trim());
        handleVerifyOffer(text.trim());
      }
    } catch {
      showToast("Clipboard paste not allowed. Please type the Offer ID.");
    }
  };

  // Copy Offer ID to Clipboard
  const handleCopyOfferId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      showToast("📋 Offer ID copied!");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      showToast("Failed to copy ID");
    }
  };

  // Apply Verified Offer directly to Active POS Cart
  const handleApplyToPOS = (offer: VerificationDetails) => {
    // Check if won item matches a service or discount
    const service = catalog.find(
      (c) =>
        c.type === "service" &&
        (c.name.toLowerCase().includes("detan") ||
          c.name.toLowerCase().includes("spa") ||
          c.name.toLowerCase().includes("hair") ||
          offer.wonItem.toLowerCase().includes(c.name.toLowerCase()))
    );

    if (service) {
      addDraftItem({
        ...service,
        price: 0, // 100% complimentary
      });
      showToast(`Applied complimentary "${service.name}" (₹0) to current active POS bill!`);
    } else {
      showToast(
        `Applied reward "${offer.wonItem}" (Offer ID: ${offer.offerToken}) to active billing transaction!`
      );
    }
  };

  // Send WhatsApp verification confirmation
  const handleSendWhatsAppConfirmation = (offer: VerificationDetails) => {
    const url = getSalonBookingWhatsAppUrl({
      customerName: offer.customerName,
      customerPhone: cleanPhoneNumber(offer.phoneNumber),
      wonItem: offer.wonItem,
      offerId: offer.offerToken,
      eventDate: offer.eventDate,
      salonName: offer.venue,
    });
    window.open(url, "_blank");
  };

  // Save Verification URLs
  const handleSaveGateUrls = () => {
    updateSettings({
      ...settings,
      google_review_url: reviewUrl.trim(),
      instagram_url: instagramUrl.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    if (!searchLog.trim()) return claimLogs;
    const q = searchLog.toLowerCase();
    return claimLogs.filter(
      (c) =>
        c.claimCode.toLowerCase().includes(q) ||
        c.prizeLabel.toLowerCase().includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.customerPhone && c.customerPhone.includes(q))
    );
  }, [claimLogs, searchLog]);

  return (
    <div className="space-y-6">
      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs shadow-2xl animate-in slide-in-from-top duration-200">
          {toastMessage}
        </div>
      )}

      {/* HEADER WITH ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>Spin-the-Wheel Offers &amp; Inventory</span>
            </h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
              L&apos;Oréal Day VIP Desk
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Verify customer Offer IDs, check campaign terms &amp; reward details, manage pool stock, and audit claims.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSpinWheelOpen(true)}
            className="gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 text-xs font-bold"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Test Spin Wheel</span>
          </Button>

          <Link
            href="/spin"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Tablet Kiosk</span>
          </Link>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800/80 overflow-x-auto no-scrollbar">
        {/* TAB 1: VERIFY OFFER ID */}
        <button
          onClick={() => setActiveSubTab("verify")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === "verify"
              ? "bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-amber-300" />
          <span>Verify Unique Offer ID</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/40 text-amber-300 font-bold border border-amber-500/40">
            Live
          </span>
        </button>

        {/* TAB 2: POOL STOCKS */}
        <button
          onClick={() => setActiveSubTab("pool")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === "pool"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Layers className="h-4 w-4 text-amber-400" />
          <span>Manage Pool Stocks</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
            {wheelInventory?.length || 6}
          </span>
        </button>

        {/* TAB 3: CLAIMS HISTORY */}
        <button
          onClick={() => setActiveSubTab("claims")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === "claims"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Customer Claim History</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
            {claimLogs.length}
          </span>
        </button>

        {/* TAB 4: VERIFICATION GATE */}
        <button
          onClick={() => setActiveSubTab("gate")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === "gate"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Verification Gate QR &amp; URLs</span>
        </button>
      </div>

      {/* SAVE NOTIFICATION BANNER */}
      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Configuration saved successfully! Changes are live on all tablets and devices.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VERIFY OFFER ID WORKBENCH */}
      {/* ========================================================================= */}
      {activeSubTab === "verify" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* SEARCH & VERIFICATION INPUT CARD */}
          <div className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-400" />
                  <span>Verify Offer by Unique ID</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Enter customer&apos;s unique Offer ID (e.g. <code>BZ-LOREAL-5501</code> or <code>BZ-SPIN-1234</code>) to check authenticity, event terms, and won items.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Event: 31st October</span>
              </div>
            </div>

            {/* INPUT FIELD + VERIFY BUTTON */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={inputOfferId}
                  onChange={(e) => setInputOfferId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVerifyOffer();
                    }
                  }}
                  placeholder="Enter Unique Offer ID (e.g. BZ-LOREAL-5501)..."
                  className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-700 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors uppercase tracking-wider"
                  autoFocus
                />
                <button
                  onClick={handlePasteOfferId}
                  className="absolute right-2 top-2 px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Paste from Clipboard"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Paste</span>
                </button>
              </div>

              <Button
                variant="accent"
                onClick={() => handleVerifyOffer()}
                disabled={isVerifying || !inputOfferId.trim()}
                className="py-2.5 px-6 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-pink-600 hover:brightness-110 text-white shadow-lg shadow-amber-500/20 shrink-0 gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify Offer</span>
                  </>
                )}
              </Button>
            </div>

            {/* QUICK SUGGESTIONS FROM RECENT CLAIMS */}
            {claimLogs.length > 0 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold shrink-0">
                  Quick Check:
                </span>
                {claimLogs.slice(0, 5).map((log) => (
                  <button
                    key={log.id}
                    onClick={() => {
                      setInputOfferId(log.claimCode);
                      handleVerifyOffer(log.claimCode);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-bold text-amber-300 transition-colors shrink-0 cursor-pointer"
                  >
                    {log.claimCode}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* VERIFICATION RESULT PANEL */}
          {/* ========================================================================= */}
          {verificationResult && verificationResult.attempted && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              {verificationResult.isValid && verificationResult.offerDetails ? (
                /* VALID OFFER CARD */
                <div className="p-6 rounded-3xl bg-zinc-900/90 border-2 border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.2)] text-left relative overflow-hidden space-y-4">
                  {/* TOP BANNER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-white">Offer Valid &amp; Verified</h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                            Authentic Voucher
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Verified against salon records • Single-use voucher eligible for redemption.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedVoucherForModal(verificationResult.offerDetails)}
                        className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>View / Print Voucher Card</span>
                      </button>
                    </div>
                  </div>

                  {/* WON PRIZE SHOWCASE */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-pink-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                        <Gift className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-mono tracking-widest text-amber-300 font-black">
                          Won Reward
                        </div>
                        <div className="text-xl font-black text-white uppercase tracking-tight">
                          {verificationResult.offerDetails.wonItem}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">
                        Unique Offer ID
                      </div>
                      <div className="text-base font-mono font-black text-amber-400 flex items-center gap-1.5 sm:justify-end">
                        <span>{verificationResult.offerDetails.offerToken}</span>
                        <button
                          onClick={() => handleCopyOfferId(verificationResult.offerDetails!.offerToken)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                          title="Copy ID"
                        >
                          {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DETAILS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* CUSTOMER */}
                    <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-zinc-500 font-bold mb-1">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Customer Name</span>
                      </div>
                      <div className="text-sm font-extrabold text-white truncate">
                        {verificationResult.offerDetails.customerName}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-zinc-500" />
                        <span>{verificationResult.offerDetails.phoneNumber}</span>
                      </div>
                    </div>

                    {/* EVENT DATE & VENUE */}
                    <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-zinc-500 font-bold mb-1">
                        <Calendar className="h-3.5 w-3.5 text-amber-400" />
                        <span>Event Date &amp; Venue</span>
                      </div>
                      <div className="text-sm font-extrabold text-amber-400">
                        {verificationResult.offerDetails.eventDate}
                      </div>
                      <div className="text-xs text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-zinc-500" />
                        <span>{verificationResult.offerDetails.venue}</span>
                      </div>
                    </div>

                    {/* ISSUE TIMESTAMP */}
                    <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-zinc-500 font-bold mb-1">
                        <Clock className="h-3.5 w-3.5 text-purple-400" />
                        <span>Issued On</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-zinc-300">
                        {new Date(verificationResult.offerDetails.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-1">
                        Status: Single-Use Claimed
                      </div>
                    </div>
                  </div>

                  {/* MANDATORY TERMS & CONDITIONS BANNER */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs font-bold leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="uppercase text-[9px] font-mono text-amber-400 block font-black">
                        Mandatory Campaign Terms:
                      </span>
                      {LOREAL_EVENT_TERMS}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 border-t border-zinc-800">
                    <button
                      onClick={() => handleApplyToPOS(verificationResult.offerDetails!)}
                      className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Apply to Current POS Cart (₹0 / Discount)</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsAppConfirmation(verificationResult.offerDetails!)}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-zinc-950 font-black text-xs shadow-md shadow-[#25D366]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="h-4 w-4 fill-zinc-950" />
                      <span>Send WhatsApp Confirmation</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* INVALID OFFER CARD */
                <div className="p-6 rounded-3xl bg-rose-950/30 border-2 border-rose-500/50 shadow-2xl text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-rose-300">
                        Invalid or Unrecognized Offer ID
                      </h4>
                      <p className="text-xs text-rose-200/80">
                        {verificationResult.error || "No offer found in database with this unique ID."}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-rose-500/30 text-xs text-zinc-300 space-y-1">
                    <p className="font-bold text-white">Recommended Front Desk Actions:</p>
                    <ul className="list-disc list-inside text-zinc-400 text-[11px] space-y-0.5">
                      <li>Verify customer did not misspell the Offer ID (check uppercase / lowercase).</li>
                      <li>Check if customer played on the live wheel and completed the claim submission.</li>
                      <li>Search by customer phone number in the Claim History tab below.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LUCKY WHEEL POOL STOCKS INVENTORY */}
      {/* ========================================================================= */}
      {activeSubTab === "pool" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <WheelInventoryManager />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CUSTOMER CLAIM AUDIT LOG */}
      {/* ========================================================================= */}
      {activeSubTab === "claims" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white">Wheel Claim History &amp; Audit Log</h3>
              <p className="text-xs text-zinc-400">
                Log of all prizes unlocked and claimed with verification status and customer mobile numbers.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search code, phone, or name..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={() => refreshClaims(true)}
                disabled={isLoadingClaims}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-200 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Refresh claims from all devices"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingClaims ? "animate-spin text-purple-400" : "text-zinc-400"}`} />
                <span className="hidden sm:inline">{isLoadingClaims ? "Refreshing..." : "Refresh"}</span>
              </button>

              {claimLogs.length > 0 && (
                <button
                  onClick={handleClearAllClaims}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Delete all dummy/test claims"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Delete All Dummy Claims</span>
                  <span className="sm:hidden">Clear All</span>
                </button>
              )}
            </div>
          </div>

          {filteredClaims.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-800">
              <Gift className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-300">No Claim Records Found</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Claims will appear here when customers spin the wheel and unlock rewards.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Claim Code</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Prize Won</th>
                      <th className="p-3">Reward Type</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Date &amp; Time</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-400">{claim.claimCode}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{claim.customerName || "Customer"}</div>
                          {claim.customerPhone && (
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {claim.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-white">{claim.prizeLabel}</td>
                        <td className="p-3 uppercase font-mono text-[10px] text-zinc-400">
                          {claim.prizeType}
                        </td>
                        <td className="p-3">
                          {claim.wasVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                              <span>Skipped</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400 font-mono text-[11px]">
                          {new Date(claim.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setActiveSubTab("verify");
                                setInputOfferId(claim.claimCode);
                                handleVerifyOffer(claim.claimCode);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Verify Details
                            </button>

                            <button
                              onClick={() => handleDeleteClaim(claim)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/40 transition-colors cursor-pointer"
                              title="Delete this claim record"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VERIFICATION GATE QR CODES & SOCIAL PROFILES */}
      {/* ========================================================================= */}
      {activeSubTab === "gate" && (
        <div className="space-y-4 max-w-2xl animate-in fade-in duration-200">
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white">Verification Gate Links &amp; QR Codes</h3>
            <p className="text-xs text-zinc-400">
              Configure the exact Google Review URL and Instagram profile that customers scan to unlock their rewards.
            </p>
          </div>

          <Card className="p-5 bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div>
              <label className="text-xs font-bold text-white flex items-center gap-1.5 mb-1.5">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>Google Reviews Rating URL</span>
              </label>
              <input
                type="url"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Customers are prompted to scan this QR code or click the direct link to review Belezia on Google.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-white flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-4 w-4 text-pink-400" />
                <span>Instagram Profile URL</span>
              </label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/beleziasalonlaxminagar"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Customers scan this QR code to follow the salon’s official Instagram handle.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <QRCodeSVG value={reviewUrl || "https://belezia.com"} size={100} level="M" />
                <span className="text-[10px] font-mono text-zinc-400 mt-2">Live Google Review QR</span>
              </div>

              <div className="flex flex-col items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <QRCodeSVG value={instagramUrl || "https://belezia.com"} size={100} level="M" />
                <span className="text-[10px] font-mono text-zinc-400 mt-2">Live Instagram QR</span>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="accent" onClick={handleSaveGateUrls} className="w-full gap-2 font-bold cursor-pointer">
                <Save className="h-4 w-4" />
                <span>Save Social Links &amp; QR Codes</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VOUCHER CARD PREVIEW / PRINT MODAL */}
      {/* ========================================================================= */}
      {selectedVoucherForModal && (
        <OfferVoucherCard
          showModalWrapper={true}
          onClose={() => setSelectedVoucherForModal(null)}
          customerName={selectedVoucherForModal.customerName}
          customerPhone={selectedVoucherForModal.phoneNumber}
          wonItem={selectedVoucherForModal.wonItem}
          offerId={selectedVoucherForModal.offerToken}
          eventDate="31st October"
          eventTime="10:00 AM – 9:00 PM"
          salonName="Belezia Salon"
          salonAddress="Laxmi Nagar, Delhi"
        />
      )}
    </div>
  );
}
