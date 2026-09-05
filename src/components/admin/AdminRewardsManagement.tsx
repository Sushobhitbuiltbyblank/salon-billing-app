"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  RewardPrize,
  DEFAULT_PRIZES,
  SpinClaimRecord,
  PrizeType,
} from "@/types/rewards";
import {
  getActivePrizes,
  saveActivePrizes,
  resetActivePrizes,
  getClaimRecords,
} from "@/lib/rewardStorage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import {
  Sparkles,
  Gift,
  Package,
  Percent,
  Tag,
  Scissors,
  Save,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Plus,
  Minus,
  Edit2,
  Lock,
  Layers,
  Star,
  RefreshCw,
  QrCode,
  Eye,
} from "lucide-react";
import Link from "next/link";

export function AdminRewardsManagement() {
  const { catalog, saveCatalogItem, settings, updateSettings, setIsSpinWheelOpen } = useApp();

  const [prizes, setPrizes] = useState<RewardPrize[]>(() => getActivePrizes());
  const [claimLogs, setClaimLogs] = useState<SpinClaimRecord[]>(() => getClaimRecords());
  const [activeSubTab, setActiveSubTab] = useState<"prizes" | "inventory" | "claims" | "gate">("prizes");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchLog, setSearchLog] = useState("");

  // Verification Gate URLs
  const [reviewUrl, setReviewUrl] = useState(settings.google_review_url || "");
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url || "");

  // Load latest prizes and claims on mount
  useEffect(() => {
    setPrizes(getActivePrizes());
    setClaimLogs(getClaimRecords());
    setReviewUrl(settings.google_review_url || "");
    setInstagramUrl(settings.instagram_url || "");
  }, [settings]);

  // Handle Prize Field Change
  const handlePrizeChange = (index: number, updates: Partial<RewardPrize>) => {
    setPrizes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Save All Prizes
  const handleSavePrizes = () => {
    saveActivePrizes(prizes);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reset to Belezia Default Slices
  const handleResetDefaults = () => {
    if (confirm("Reset all 8 wheel slices back to default Belezia rewards?")) {
      const reset = resetActivePrizes();
      setPrizes(reset);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
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

  // Quick Stock Adjustment (+ / -) for catalog products
  const handleAdjustStock = async (itemId: string, delta: number) => {
    const item = catalog.find((c) => c.id === itemId);
    if (!item) return;

    const newQty = Math.max(0, (item.stock_qty ?? 0) + delta);
    await saveCatalogItem({
      ...item,
      stock_qty: newQty,
    });
  };

  // Filtered physical products from catalog
  const retailProducts = useMemo(() => {
    return catalog.filter((item) => item.type === "product");
  }, [catalog]);

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
            Manage the 8 wheel prize slices, monitor inventory for physical product gifts, and view customer claim logs.
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
            <span>Tablet Kiosk Mode</span>
          </Link>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800/80 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab("prizes")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === "prizes"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>Wheel Offers & Slices (8)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("inventory")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === "inventory"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Product Gift Inventory</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
            {retailProducts.length}
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
      {/* 1. OFFERS & PRIZES SLICES CONFIGURATION */}
      {/* ========================================================================= */}
      {activeSubTab === "prizes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white">Wheel Slices & Reward Offers</h3>
              <p className="text-xs text-zinc-400">
                Customize the 8 slices on the lucky wheel. Physical product gifts automatically deduct stock upon claim.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                className="gap-1 text-xs border-zinc-700 text-zinc-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleSavePrizes}
                className="gap-1 text-xs font-bold"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save All Slices</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prizes.map((prize, idx) => (
              <Card
                key={prize.id}
                className="p-4 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 space-y-3 relative overflow-hidden"
              >
                {/* SLICE COLOR STRIP */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-2"
                  style={{ backgroundColor: prize.color }}
                />

                <div className="flex items-center justify-between pl-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                      style={{ backgroundColor: prize.color }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white tracking-tight">{prize.label}</span>
                  </div>

                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {prize.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pl-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Full Prize Label
                    </label>
                    <input
                      type="text"
                      value={prize.label}
                      onChange={(e) => handlePrizeChange(idx, { label: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Wheel Slice Text (Short)
                    </label>
                    <input
                      type="text"
                      value={prize.shortLabel}
                      onChange={(e) => handlePrizeChange(idx, { shortLabel: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pl-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Reward Type
                    </label>
                    <select
                      value={prize.type}
                      onChange={(e) => {
                        const newType = e.target.value as PrizeType;
                        handlePrizeChange(idx, {
                          type: newType,
                          requiresInventoryDeduction: newType === "product_gift",
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="service">Free Service</option>
                      <option value="discount_percent">Discount (%)</option>
                      <option value="discount_flat">Discount Flat (₹)</option>
                      <option value="product_gift">Product Gift</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Value ({prize.type === "discount_percent" ? "%" : "₹"})
                    </label>
                    <input
                      type="number"
                      value={prize.value}
                      onChange={(e) => handlePrizeChange(idx, { value: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Slice Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={prize.color}
                        onChange={(e) => handlePrizeChange(idx, { color: e.target.value })}
                        className="h-8 w-10 rounded bg-zinc-950 border border-zinc-800 cursor-pointer p-0.5"
                      />
                      <span className="text-[11px] font-mono text-zinc-400">{prize.color}</span>
                    </div>
                  </div>
                </div>

                <div className="pl-2 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Description / Terms
                    </label>
                    <input
                      type="text"
                      value={prize.description}
                      onChange={(e) => handlePrizeChange(idx, { description: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* INVENTORY LINK (IF PRODUCT GIFT) */}
                  {prize.type === "product_gift" && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-amber-400" />
                        <div>
                          <span className="text-xs font-bold text-amber-300">Linked to Catalog Stock</span>
                          <p className="text-[10px] text-zinc-400">
                            Claiming this gift decrements retail product inventory in database (-1).
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                        Auto-Deduct ON
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="accent" onClick={handleSavePrizes} className="gap-1.5 font-bold">
              <Save className="h-4 w-4" />
              <span>Save All Slices</span>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRODUCT GIFT INVENTORY MONITOR */}
      {/* ========================================================================= */}
      {activeSubTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white">Product Gift Stock & Inventory</h3>
              <p className="text-xs text-zinc-400">
                Monitor and adjust current stock for retail products and items linked as lucky wheel gifts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {retailProducts.map((product) => {
              const currentStock = product.stock_qty ?? 0;
              const isLowStock = currentStock < 5;

              return (
                <Card
                  key={product.id}
                  className="p-4 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                        {product.sku || "RETAIL"}
                      </span>
                      {isLowStock ? (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          Low Stock ({currentStock})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                          In Stock ({currentStock})
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white tracking-tight">{product.name}</h4>
                    <p className="text-xs text-zinc-400">Price: ₹{product.price}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-[9px] uppercase font-mono text-zinc-500">Available Qty</div>
                      <div className="text-lg font-mono font-black text-amber-400">{currentStock}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustStock(product.id, -1)}
                        disabled={currentStock <= 0}
                        className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
                        title="Deduct 1 from Stock"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleAdjustStock(product.id, 1)}
                        className="h-8 w-8 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 flex items-center justify-center cursor-pointer transition-colors"
                        title="Add 1 to Stock"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleAdjustStock(product.id, 10)}
                        className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
                        title="Add 10 to Stock"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CUSTOMER CLAIM AUDIT LOG */}
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
      {/* 4. VERIFICATION GATE QR CODES & SOCIAL PROFILES */}
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
