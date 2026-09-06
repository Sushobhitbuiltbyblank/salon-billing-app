"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { SpinClaimRecord } from "@/types/rewards";
import { getClaimRecords } from "@/lib/rewardStorage";
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
} from "lucide-react";
import Link from "next/link";
import { WheelInventoryManager } from "./WheelInventoryManager";

export function AdminRewardsManagement() {
  const { settings, updateSettings, setIsSpinWheelOpen, wheelInventory } = useApp();

  const [claimLogs, setClaimLogs] = useState<SpinClaimRecord[]>(() => getClaimRecords());
  const [activeSubTab, setActiveSubTab] = useState<"pool" | "claims" | "gate">("pool");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchLog, setSearchLog] = useState("");

  // Verification Gate URLs
  const [reviewUrl, setReviewUrl] = useState(settings.google_review_url || "");
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url || "");

  // Load latest claims on mount
  useEffect(() => {
    setClaimLogs(getClaimRecords());
    setReviewUrl(settings.google_review_url || "");
    setInstagramUrl(settings.instagram_url || "");
  }, [settings]);

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
      {/* HEADER WITH ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>Spin-the-Wheel Offers & Inventory</span>
            </h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
              VIP Rewards Desk
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage live reward pool stock quantities, monitor customer claims, and configure verification URLs.
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

        <button
          onClick={() => setActiveSubTab("gate")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === "gate"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Verification Gate QR & URLs</span>
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
      {/* 1. LUCKY WHEEL POOL STOCKS INVENTORY */}
      {/* ========================================================================= */}
      {activeSubTab === "pool" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <WheelInventoryManager />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CUSTOMER CLAIM AUDIT LOG */}
      {/* ========================================================================= */}
      {activeSubTab === "claims" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white">Wheel Claim History & Audit Log</h3>
              <p className="text-xs text-zinc-400">
                Log of all prizes unlocked and claimed at the front desk with verification status.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search claim code or prize..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
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
                      <th className="p-3">Prize Won</th>
                      <th className="p-3">Reward Type</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Inventory Stock</th>
                      <th className="p-3">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-400">{claim.claimCode}</td>
                        <td className="p-3 font-bold text-white">{claim.prizeLabel}</td>
                        <td className="p-3 uppercase font-mono text-[10px] text-zinc-400">
                          {claim.prizeType}
                        </td>
                        <td className="p-3">
                          {claim.wasVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Verified (Google + Insta)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                              <span>Skipped</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {claim.inventoryDeducted ? (
                            <span className="text-emerald-400 font-bold text-[11px]">Deducted (-1)</span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">No Deduction</span>
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
      {/* 3. VERIFICATION GATE QR CODES & SOCIAL PROFILES */}
      {/* ========================================================================= */}
      {activeSubTab === "gate" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white">Verification Gate Links & QR Codes</h3>
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
              <Button variant="accent" onClick={handleSaveGateUrls} className="w-full gap-2 font-bold">
                <Save className="h-4 w-4" />
                <span>Save Social Links & QR Codes</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
