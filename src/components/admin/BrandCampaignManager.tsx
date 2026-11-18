"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  Save,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Tag,
  Palette,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sliders,
  Calendar,
  MapPin,
  Check,
} from "lucide-react";
import {
  SpinBrandConfig,
  WheelInventoryItem,
  WheelItemCategory,
  DEFAULT_KANPEKI_CONFIG,
  DEFAULT_KANPEKI_INVENTORY,
  BRAND_PRESETS,
  removeProductQuantity,
} from "@/types/rewards";
import {
  fetchServerBrandConfig,
  updateServerBrandConfig,
  fetchServerWheelInventory,
} from "@/lib/rewardStorage";

const COLOR_OPTIONS = [
  { label: "Pink", value: "#ec4899" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Cyan", value: "#06b6d4" },
];

export function BrandCampaignManager() {
  const [brandConfig, setBrandConfig] = useState<SpinBrandConfig>(DEFAULT_KANPEKI_CONFIG);
  const [inventory, setInventory] = useState<WheelInventoryItem[]>(DEFAULT_KANPEKI_INVENTORY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("kanpeki");

  // Inline Add Prize Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPrizeTitle, setNewPrizeTitle] = useState("");
  const [newPrizeCategory, setNewPrizeCategory] = useState<WheelItemCategory>("free_service");
  const [newPrizeQuantity, setNewPrizeQuantity] = useState<number>(30);
  const [newPrizeColor, setNewPrizeColor] = useState<string>("#ec4899");

  // Test Simulation State
  const [testSimulatingId, setTestSimulatingId] = useState<string | null>(null);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  // Load from server on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchServerBrandConfig(), fetchServerWheelInventory()])
      .then(([config, items]) => {
        if (!isMounted) return;
        if (config) {
          setBrandConfig(config);
          const found = BRAND_PRESETS.find(
            (p) => p.config.brandName.toLowerCase() === config.brandName.toLowerCase()
          );
          if (found) setSelectedPreset(found.id);
          else setSelectedPreset("custom");
        }
        if (items && items.length > 0) {
          setInventory(items);
        }
      })
      .catch((err) => {
        console.error("Failed to load brand configuration:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Preset Switching
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = BRAND_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (
      confirm(
        `Switch Lucky Wheel brand to "${preset.name}"?\n\nThis will load the recommended brand settings and set 30 stock for each prize slice.`
      )
    ) {
      setBrandConfig({
        ...preset.config,
        updatedAt: new Date().toISOString(),
      });
      setInventory(preset.inventory.map((it) => ({ ...it, quantity: 30 })));
      setSimulationLog(`Loaded preset for ${preset.config.brandName} with 30 stock per prize.`);
    }
  };

  // Update item quantity
  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    const safeQty = Math.max(0, newQty);
    setInventory((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, quantity: safeQty } : it))
    );
  };

  // Adjust item quantity by delta (+1, -1, +10)
  const handleAdjustQuantity = (itemId: string, delta: number) => {
    setInventory((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const next = Math.max(0, (it.quantity || 0) + delta);
          return { ...it, quantity: next };
        }
        return it;
      })
    );
  };

  // Toggle item active
  const handleToggleActive = (itemId: string) => {
    setInventory((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, is_active: !it.is_active } : it))
    );
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    const item = inventory.find((it) => it.id === itemId);
    if (!item) return;
    if (confirm(`Remove "${item.title}" from the Lucky Wheel?`)) {
      setInventory((prev) => prev.filter((it) => it.id !== itemId));
    }
  };

  // Reset all stock to 30
  const handleResetAllTo30 = () => {
    if (confirm("Reset ALL prizes in the Lucky Wheel to exactly 30 stock each?")) {
      setInventory((prev) => prev.map((it) => ({ ...it, quantity: 30 })));
      setSimulationLog("All prizes reset to 30 stock.");
    }
  };

  // Add new prize
  const handleAddPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeTitle.trim()) return;

    const newItem: WheelInventoryItem = {
      id: `prize-${Date.now()}`,
      title: removeProductQuantity(newPrizeTitle.trim()),
      category: newPrizeCategory,
      quantity: Math.max(0, newPrizeQuantity || 30),
      is_active: true,
      color: newPrizeColor,
      created_at: new Date().toISOString(),
    };

    setInventory((prev) => [...prev, newItem]);
    setNewPrizeTitle("");
    setNewPrizeQuantity(30);
    setIsAddModalOpen(false);
    setSimulationLog(`Added "${newItem.title}" with ${newItem.quantity} stock.`);
  };

  // Simulate Stock Decrement (Demonstrates 30 -> 29)
  const handleSimulateClaimDecrement = async (item: WheelInventoryItem) => {
    if ((item.quantity || 0) <= 0) {
      alert(`"${item.title}" is out of stock (0 remaining)!`);
      return;
    }
    setTestSimulatingId(item.id);
    const prevQty = item.quantity || 0;
    const nextQty = Math.max(0, prevQty - 1);

    // Locally decrement
    handleUpdateQuantity(item.id, nextQty);

    // Call server to test real API decrement
    try {
      const res = await fetch("/api/wheel-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decrement", itemId: item.id }),
      });
      if (res.ok) {
        setSimulationLog(
          `✅ Decrement test passed: Customer claimed "${item.title}". Stock decremented from ${prevQty} → ${nextQty} in live cloud database!`
        );
      } else {
        setSimulationLog(`Stock decremented locally to ${nextQty}.`);
      }
    } catch {
      setSimulationLog(`Stock decremented locally to ${nextQty}.`);
    } finally {
      setTimeout(() => setTestSimulatingId(null), 800);
    }
  };

  // Save full configuration & inventory
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const ok = await updateServerBrandConfig(brandConfig, inventory);
      if (ok) {
        setSaveSuccess(true);
        setSimulationLog(
          `🎉 Successfully deployed Lucky Wheel for brand "${brandConfig.brandName}"! All tablets and customer links are now live.`
        );
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert("Failed to save configuration. Please check network connection.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving configuration to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalStock = inventory.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const activeItemsCount = inventory.filter((it) => it.is_active && (it.quantity || 0) > 0).length;

  if (isLoading) {
    return (
      <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
        <Sparkles className="h-6 w-6 text-pink-400 animate-spin mx-auto" />
        <p className="text-xs font-mono text-zinc-400">Loading Lucky Wheel brand configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER & LIVE BRAND STATUS */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-pink-950/40 border border-pink-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                Active Brand: {brandConfig.brandName || "Kanpeki"}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  brandConfig.isSpinActive
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-950/80 text-amber-300 border-amber-500/40"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    brandConfig.isSpinActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {brandConfig.isSpinActive ? "Wheel Game is LIVE" : "Concluded / Thank You Mode"}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold">
                Pool Stock: {totalStock} units
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Lucky Wheel Brand &amp; Campaign Setup
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Configure the Lucky Wheel for any partner brand (currently <strong>Kanpeki</strong>).
              Stock automatically decrements in real-time when customers win prizes (e.g. 30 → 29).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving & Deploying..." : "Save Brand Setup"}</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Configuration saved successfully! The live Lucky Wheel is now updated for{" "}
              <strong>{brandConfig.brandName}</strong> with <strong>{totalStock} units</strong> stock.
            </span>
          </div>
        )}

        {simulationLog && (
          <div className="mt-3 p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-200 text-xs font-medium flex items-center justify-between gap-2">
            <span>{simulationLog}</span>
            <button
              onClick={() => setSimulationLog(null)}
              className="text-zinc-400 hover:text-white text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. 1-CLICK BRAND PRESET SELECTOR */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-pink-400" />
            <h3 className="text-sm font-extrabold text-white">Choose Brand Preset</h3>
          </div>
          <span className="text-[11px] text-zinc-400">1-Click pre-fills brand rules &amp; prizes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BRAND_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "bg-pink-950/40 border-pink-500/60 shadow-lg shadow-pink-600/20 ring-1 ring-pink-500/50"
                    : "bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{preset.name}</span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-pink-300 font-bold px-1.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40">
                      <Check className="h-3 w-3" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2">{preset.config.tagline}</p>
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400">
                  <span>Prefix: {preset.config.offerPrefix}</span>
                  <span>•</span>
                  <span>4 Prizes (30 each)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BRAND & CAMPAIGN DETAILS FORM */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-extrabold text-white">Brand Campaign Details</h3>
          </div>
          <span className="text-xs text-zinc-500">Live on /spin &amp; customer vouchers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BRAND NAME */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Brand Name</span>
              <span className="text-[10px] text-zinc-500">e.g. Kanpeki, L&apos;Oréal</span>
            </label>
            <input
              type="text"
              value={brandConfig.brandName}
              onChange={(e) => setBrandConfig({ ...brandConfig, brandName: e.target.value })}
              placeholder="e.g. Kanpeki"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs font-semibold focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* CAMPAIGN HEADLINE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Campaign Event Headline</span>
              <span className="text-[10px] text-zinc-500">Displayed on wheel header</span>
            </label>
            <input
              type="text"
              value={brandConfig.eventName}
              onChange={(e) => setBrandConfig({ ...brandConfig, eventName: e.target.value })}
              placeholder="e.g. Kanpeki Japanese Skin &amp; Hair Rituals Event"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs font-semibold focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* TAGLINE / HIGHLIGHTS */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Event Tagline / Subtitle</span>
              <span className="text-[10px] text-zinc-500">Shown below header</span>
            </label>
            <input
              type="text"
              value={brandConfig.tagline}
              onChange={(e) => setBrandConfig({ ...brandConfig, tagline: e.target.value })}
              placeholder="e.g. Exclusive Japanese Skincare Consultations &amp; Guaranteed Lucky Wheel Rewards"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs font-semibold focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* OFFER CODE PREFIX */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Offer Code Prefix</span>
              <span className="text-[10px] text-purple-400 font-mono">
                Sample: {brandConfig.offerPrefix || "BZ-KANPEKI-"}4892
              </span>
            </label>
            <input
              type="text"
              value={brandConfig.offerPrefix}
              onChange={(e) => setBrandConfig({ ...brandConfig, offerPrefix: e.target.value })}
              placeholder="e.g. BZ-KANPEKI-"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs font-mono font-bold uppercase focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* EVENT DATE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Event Date &amp; Time</span>
              <span className="text-[10px] text-zinc-500">Printed on vouchers</span>
            </label>
            <input
              type="text"
              value={brandConfig.eventDate}
              onChange={(e) => setBrandConfig({ ...brandConfig, eventDate: e.target.value })}
              placeholder="e.g. Saturday, November 28, 2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs font-semibold focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* EVENT VENUE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Salon Venue</span>
              <span className="text-[10px] text-zinc-500">Address on vouchers</span>
            </label>
            <input
              type="text"
              value={brandConfig.eventVenue}
              onChange={(e) => setBrandConfig({ ...brandConfig, eventVenue: e.target.value })}
              placeholder="e.g. Belezia Salon, Laxmi Nagar"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs font-semibold focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* PUBLIC WHEEL GAME TOGGLE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Public Wheel Status</span>
              <span className="text-[10px] text-zinc-500">belezia-offers.vercel.app/spin</span>
            </label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-200">
                {brandConfig.isSpinActive ? "🎮 Live Spin The Wheel Game" : "🎉 Event Concluded View"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setBrandConfig({ ...brandConfig, isSpinActive: !brandConfig.isSpinActive })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  brandConfig.isSpinActive ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    brandConfig.isSpinActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* DISCLAIMER TERMS */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Event Disclaimer &amp; Terms</span>
              <span className="text-[10px] text-amber-400">Embedded in WhatsApp &amp; Vouchers</span>
            </label>
            <textarea
              rows={3}
              value={brandConfig.disclaimerTerms}
              onChange={(e) => setBrandConfig({ ...brandConfig, disclaimerTerms: e.target.value })}
              placeholder="🚨 Disclaimer: This exclusive offer and free goodies are valid strictly on a First-Come, First-Served basis..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs leading-relaxed focus:outline-none focus:border-pink-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PRIZE POOL & LIVE STOCK MANAGEMENT (WITH AUTO-DECREMENT) */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl space-y-4">
        {/* SECTION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-extrabold text-white">
                Reward Pool &amp; Live Stock Inventory
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configured prizes with real-time stock tracking ({activeItemsCount} active slices,{" "}
              {totalStock} total units).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetAllTo30}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold border border-zinc-700 transition-all cursor-pointer"
              title="Set all current prizes to 30 stock each"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset All to 30 Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Prize</span>
            </button>
          </div>
        </div>

        {/* AUTO-DECREMENT INFO CALLOUT */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-300">Live Stock Decrement Active:</strong> Whenever a
            customer spins the wheel on their phone or tablet and claims an offer, 1 stock is
            instantly deducted from that prize slice (e.g. <strong>30 remaining → 29 remaining</strong>
            ). When an offer is cancelled or deleted in history, stock is restored. Items with 0 stock
            are automatically excluded from winning.
          </div>
        </div>

        {/* PRIZES TABLE / CARDS */}
        <div className="space-y-2.5">
          {inventory.map((item, idx) => {
            const qty = item.quantity ?? 0;
            const isSimulating = testSimulatingId === item.id;

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.is_active
                    ? "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                    : "bg-zinc-950/30 border-zinc-850 opacity-60"
                } ${isSimulating ? "ring-2 ring-amber-400 bg-amber-950/20" : ""}`}
              >
                {/* LEFT: SLICE INFO & COLOR */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-bold text-zinc-500 w-5">#{idx + 1}</span>
                  <div
                    className="w-4 h-4 rounded-full shrink-0 border border-white/20 shadow-sm"
                    style={{ backgroundColor: item.color || "#8b5cf6" }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {item.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-mono uppercase">
                        {item.category.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">ID: {item.id}</span>
                  </div>
                </div>

                {/* RIGHT: STOCK CONTROLS & TEST SIMULATOR */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                  {/* STOCK BADGE */}
                  <div
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                      qty > 10
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                        : qty > 0
                        ? "bg-amber-950/60 text-amber-300 border-amber-500/40"
                        : "bg-rose-950/60 text-rose-300 border-rose-500/40"
                    }`}
                  >
                    <span>{qty > 0 ? `${qty} in stock` : "OUT OF STOCK"}</span>
                  </div>

                  {/* STEPPER BUTTONS */}
                  <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-700/80 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleAdjustQuantity(item.id, -1)}
                      className="px-2 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
                      title="Decrease by 1"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) =>
                        handleUpdateQuantity(item.id, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-12 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdjustQuantity(item.id, 1)}
                      className="px-2 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
                      title="Increase by 1"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustQuantity(item.id, 10)}
                      className="px-2 py-1 text-[11px] font-bold text-purple-300 hover:text-purple-200 hover:bg-purple-950/50 rounded-lg cursor-pointer border-l border-zinc-800"
                      title="Add 10 stock"
                    >
                      +10
                    </button>
                  </div>

                  {/* TEST SIMULATE CLAIM (DEMONSTRATES 30 -> 29) */}
                  <button
                    type="button"
                    onClick={() => handleSimulateClaimDecrement(item)}
                    disabled={qty <= 0 || isSimulating}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer disabled:opacity-40"
                    title={`Simulate 1 customer claim for ${item.title} to test auto-decrement`}
                  >
                    <Zap className="h-3 w-3" />
                    <span>Test Claim (-1)</span>
                  </button>

                  {/* ACTIVE TOGGLE */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id)}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      item.is_active
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    {item.is_active ? "Active" : "Disabled"}
                  </button>

                  {/* DELETE BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ADD PRIZE MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-400" />
                <span>Add New Reward Prize</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPrize} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Prize Title</label>
                <input
                  type="text"
                  required
                  value={newPrizeTitle}
                  onChange={(e) => setNewPrizeTitle(e.target.value)}
                  placeholder="e.g. Free Kanpeki Hydrating Hair Spa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Category</label>
                  <select
                    value={newPrizeCategory}
                    onChange={(e) => setNewPrizeCategory(e.target.value as WheelItemCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none"
                  >
                    <option value="free_service">Free Service</option>
                    <option value="gift">Physical Gift</option>
                    <option value="discount_coupon">Discount Coupon</option>
                    <option value="offer">Special Offer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Initial Stock</label>
                  <input
                    type="number"
                    min={1}
                    value={newPrizeQuantity}
                    onChange={(e) => setNewPrizeQuantity(parseInt(e.target.value, 10) || 30)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Wheel Slice Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewPrizeColor(c.value)}
                      className={`h-7 w-7 rounded-full border-2 cursor-pointer transition-transform ${
                        newPrizeColor === c.value ? "scale-110 border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-bold hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Add to Pool (30 Units)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. BOTTOM DEPLOY BAR */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-zinc-300">
            Changes will be deployed to all devices, tablets, and customer links on{" "}
            <code className="text-pink-300">/spin</code>.
          </span>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? "Saving..." : "Save & Deploy"}</span>
        </button>
      </div>
    </div>
  );
}
