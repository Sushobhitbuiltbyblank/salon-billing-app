"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { InvoiceItem, Staff } from "@/types";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, User, Percent, Sparkles, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SplitStaffModalProps {
  item: InvoiceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedItem: Partial<InvoiceItem>) => void;
}

export function SplitStaffModal({
  item,
  open,
  onOpenChange,
  onSave,
}: SplitStaffModalProps) {
  const { staff, settings } = useApp();

  const [primaryStaffId, setPrimaryStaffId] = useState<string>("");
  const [secondaryStaffId, setSecondaryStaffId] = useState<string>("");
  const [primaryRatio, setPrimaryRatio] = useState<number>(100);
  const [secondaryRatio, setSecondaryRatio] = useState<number>(0);

  useEffect(() => {
    if (open && item) {
      setPrimaryStaffId(item.primary_staff_id || "");
      setSecondaryStaffId(item.secondary_staff_id || "");
      setPrimaryRatio(item.primary_split_ratio ?? 100);
      setSecondaryRatio(item.secondary_split_ratio ?? 0);
    }
  }, [open, item?.id]);

  if (!item) return null;

  const handleRatioChange = (pRatio: number) => {
    const clampedPrimary = Math.max(0, Math.min(100, pRatio));
    setPrimaryRatio(clampedPrimary);
    setSecondaryRatio(100 - clampedPrimary);
  };

  const handlePresetClick = (pRatio: number, sRatio: number) => {
    setPrimaryRatio(pRatio);
    setSecondaryRatio(sRatio);
  };

  const primaryStaff = staff.find((s) => s.id === primaryStaffId);
  const secondaryStaff = staff.find((s) => s.id === secondaryStaffId);

  const isProduct = item.item_type === "product";

  // Incentive Calculations
  const itemTotal = item.total_price || item.unit_price * item.quantity;
  const primarySalesVolume = (itemTotal * primaryRatio) / 100;
  const secondarySalesVolume = (itemTotal * secondaryRatio) / 100;

  // Primary Staff Incentive
  let primaryCommission = 0;
  let primaryRateLabel = "";
  if (primaryStaff) {
    const rate = isProduct
      ? (primaryStaff.product_commission_rate ?? primaryStaff.commission_rate)
      : primaryStaff.commission_rate;
    const type = isProduct
      ? (primaryStaff.product_commission_type ?? primaryStaff.commission_type ?? "percent")
      : (primaryStaff.commission_type ?? "percent");

    if (type === "fixed") {
      primaryCommission = (rate * item.quantity * primaryRatio) / 100;
      primaryRateLabel = `${formatCurrency(rate, settings.currency_symbol)} Flat`;
    } else {
      primaryCommission = (primarySalesVolume * rate) / 100;
      primaryRateLabel = `${rate}% Rate`;
    }
  }

  // Secondary Staff Incentive
  let secondaryCommission = 0;
  let secondaryRateLabel = "";
  if (secondaryStaff) {
    const rate = isProduct
      ? (secondaryStaff.product_commission_rate ?? secondaryStaff.commission_rate)
      : secondaryStaff.commission_rate;
    const type = isProduct
      ? (secondaryStaff.product_commission_type ?? secondaryStaff.commission_type ?? "percent")
      : (secondaryStaff.commission_type ?? "percent");

    if (type === "fixed") {
      secondaryCommission = (rate * item.quantity * secondaryRatio) / 100;
      secondaryRateLabel = `${formatCurrency(rate, settings.currency_symbol)} Flat`;
    } else {
      secondaryCommission = (secondarySalesVolume * rate) / 100;
      secondaryRateLabel = `${rate}% Rate`;
    }
  }

  const handleConfirm = () => {
    if (item.item_type === "service" && !primaryStaffId) {
      alert("⚠️ Stylist Selection Required\n\nPlease select a primary stylist for this service.");
      return;
    }

    onSave({
      primary_staff_id: primaryStaffId || undefined,
      secondary_staff_id: secondaryStaffId ? secondaryStaffId : undefined,
      primary_split_ratio: primaryRatio,
      secondary_split_ratio: secondaryStaffId ? secondaryRatio : 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="md">
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Split Staff & Commission</DialogTitle>
            <DialogDescription>
              Assign 1 or 2 stylists for <span className="text-white font-semibold">{item.item_name}</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 pt-4">
        {/* ITEM PRICE BANNER */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
          <div>
            <span className="text-[11px] text-zinc-400">Line Item Total</span>
            <div className="text-sm font-bold text-white">{item.item_name}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500">Service Value</span>
            <div className="text-base font-extrabold text-emerald-400 font-mono">
              {formatCurrency(itemTotal, settings.currency_symbol)}
            </div>
          </div>
        </div>

        {/* PRIMARY STYLIST SELECTOR */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Primary Stylist (Lead) *
            </label>
            {primaryStaff && (
              <span className="text-[11px] text-purple-400 font-bold">
                Incentive: {primaryRateLabel}
              </span>
            )}
          </div>
          <select
            value={primaryStaffId}
            onChange={(e) => setPrimaryStaffId(e.target.value)}
            className="w-full h-10 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">-- Select Stylist --</option>
            {staff.map((s) => {
              const rate = isProduct ? (s.product_commission_rate ?? s.commission_rate) : s.commission_rate;
              const type = isProduct ? (s.product_commission_type ?? s.commission_type ?? "percent") : (s.commission_type ?? "percent");
              const label = type === "fixed" ? `${settings.currency_symbol}${rate} Flat` : `${rate}%`;
              return (
                <option key={s.id} value={s.id} disabled={s.status !== "active"}>
                  {s.name} ({s.role}) - {label} {s.status === "on_leave" ? " [On Leave]" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* SECONDARY STYLIST (ASSISTANT / CO-STYLIST) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-pink-300 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Secondary Stylist / Assistant (Optional)
            </label>
            {secondaryStaff && (
              <span className="text-[11px] text-pink-400 font-bold">
                Incentive: {secondaryRateLabel}
              </span>
            )}
          </div>
          <select
            value={secondaryStaffId}
            onChange={(e) => {
              const val = e.target.value;
              setSecondaryStaffId(val);
              if (val && primaryRatio === 100) {
                // Default to 60/40 when secondary stylist is chosen
                setPrimaryRatio(60);
                setSecondaryRatio(40);
              } else if (!val) {
                setPrimaryRatio(100);
                setSecondaryRatio(0);
              }
            }}
            className="w-full h-10 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">-- None (Single Stylist 100%) --</option>
            {staff
              .filter((s) => s.id !== primaryStaffId)
              .map((s) => {
                const rate = isProduct ? (s.product_commission_rate ?? s.commission_rate) : s.commission_rate;
                const type = isProduct ? (s.product_commission_type ?? s.commission_type ?? "percent") : (s.commission_type ?? "percent");
                const label = type === "fixed" ? `${settings.currency_symbol}${rate} Flat` : `${rate}%`;
                return (
                  <option key={s.id} value={s.id} disabled={s.status !== "active"}>
                    {s.name} ({s.role}) - {label} {s.status === "on_leave" ? " [On Leave]" : ""}
                  </option>
                );
              })}
          </select>
        </div>

        {/* SPLIT RATIO PRESETS AND SLIDER (WHEN SECONDARY IS SELECTED) */}
        {secondaryStaffId && (
          <div className="space-y-3 p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>Split Percentage Ratio</span>
              <div className="font-mono text-purple-300 font-bold">
                {primaryRatio}% : {secondaryRatio}%
              </div>
            </div>

            {/* PRESET CHIPS */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { p: 50, s: 50, label: "50 / 50" },
                { p: 60, s: 40, label: "60 / 40" },
                { p: 70, s: 30, label: "70 / 30" },
                { p: 80, s: 20, label: "80 / 20" },
              ].map((preset) => {
                const isActive = primaryRatio === preset.p && secondaryRatio === preset.s;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset.p, preset.s)}
                    className={`py-1 text-xs font-semibold rounded-lg border transition-all ${
                      isActive
                        ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* CUSTOM SLIDER */}
            <div className="pt-1">
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={primaryRatio}
                onChange={(e) => handleRatioChange(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                <span>Primary ({primaryRatio}%)</span>
                <span>Secondary ({secondaryRatio}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* INCENTIVE PREVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* PRIMARY BREAKDOWN */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30">
            <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">
              Primary: {primaryStaff ? primaryStaff.name : "Not Selected"}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs text-zinc-400">Share ({primaryRatio}%)</span>
              <span className="text-xs font-semibold text-zinc-200 font-mono">
                {formatCurrency(primarySalesVolume, settings.currency_symbol)}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-purple-900/30">
              <span className="text-xs text-purple-300 font-medium">Incentive ({primaryRateLabel || "0%"})</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {formatCurrency(primaryCommission, settings.currency_symbol)}
              </span>
            </div>
          </div>

          {/* SECONDARY BREAKDOWN */}
          {secondaryStaffId ? (
            <div className="p-3 rounded-xl bg-pink-950/20 border border-pink-800/30">
              <div className="text-[10px] uppercase tracking-wider text-pink-400 font-bold">
                Secondary: {secondaryStaff ? secondaryStaff.name : "Not Selected"}
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs text-zinc-400">Share ({secondaryRatio}%)</span>
                <span className="text-xs font-semibold text-zinc-200 font-mono">
                  {formatCurrency(secondarySalesVolume, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-pink-900/30">
                <span className="text-xs text-pink-300 font-medium">Incentive ({secondaryRateLabel || "0%"})</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {formatCurrency(secondaryCommission, settings.currency_symbol)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-center text-zinc-500 text-xs">
              Single stylist assigned (100% volume)
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleConfirm}>
          Save & Apply Split
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
