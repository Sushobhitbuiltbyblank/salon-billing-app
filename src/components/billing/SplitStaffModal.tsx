"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { InvoiceItem, Staff, StaffSplitAssignment } from "@/types";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, User, Plus, Trash2, CheckCircle2, AlertCircle, Sparkles, Scale, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SplitStaffModalProps {
  item: InvoiceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedItem: Partial<InvoiceItem>) => void;
}

interface StaffSplitRow {
  staff_id: string;
  amount: number | string;
}

export function SplitStaffModal({
  item,
  open,
  onOpenChange,
  onSave,
}: SplitStaffModalProps) {
  const { staff, settings } = useApp();

  const [splitRows, setSplitRows] = useState<StaffSplitRow[]>([]);

  const itemTotal = useMemo(() => {
    if (!item) return 0;
    return item.total_price || (item.unit_price * item.quantity);
  }, [item]);

  const isProduct = item?.item_type === "product";

  useEffect(() => {
    if (open && item) {
      const currentItemTotal = item.total_price || (item.unit_price * item.quantity);

      if (item.staff_splits && item.staff_splits.length > 0) {
        setSplitRows(
          item.staff_splits.map((s) => ({
            staff_id: s.staff_id,
            amount: s.amount,
          }))
        );
      } else if (item.secondary_staff_id) {
        const pRatio = item.primary_split_ratio ?? 50;
        const pAmount = Math.round((currentItemTotal * pRatio) / 100);
        const sAmount = currentItemTotal - pAmount;
        setSplitRows([
          { staff_id: item.primary_staff_id || "", amount: pAmount },
          { staff_id: item.secondary_staff_id, amount: sAmount },
        ]);
      } else if (item.primary_staff_id) {
        setSplitRows([{ staff_id: item.primary_staff_id, amount: currentItemTotal }]);
      } else {
        // Find first active/available staff
        const firstActive = staff.find((s) => s.status === "active" || s.status === "half_day");
        setSplitRows([{ staff_id: firstActive?.id || "", amount: currentItemTotal }]);
      }
    }
  }, [open, item?.id]);

  if (!item) return null;

  // Calculate sum of currently allocated amounts
  const allocatedSum = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const remainingAmount = itemTotal - allocatedSum;
  const isBalanced = allocatedSum === itemTotal;
  const isOverallocated = allocatedSum > itemTotal;
  const isUnderallocated = allocatedSum < itemTotal;

  const handleAddStylist = () => {
    // Pick an unselected staff if possible
    const selectedIds = new Set(splitRows.map((r) => r.staff_id));
    const nextAvailable = staff.find(
      (s) => !selectedIds.has(s.id) && (s.status === "active" || s.status === "half_day")
    );

    const nextAmount = Math.max(0, remainingAmount);
    setSplitRows((prev) => [
      ...prev,
      {
        staff_id: nextAvailable ? nextAvailable.id : "",
        amount: nextAmount === 0 ? "" : nextAmount,
      },
    ]);
  };

  const handleRemoveStylist = (indexToRemove: number) => {
    if (splitRows.length <= 1) return;
    setSplitRows((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleStaffChange = (index: number, newStaffId: string) => {
    setSplitRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, staff_id: newStaffId } : row))
    );
  };

  const handleAmountChange = (index: number, val: string) => {
    const numericVal = val === "" ? "" : Math.max(0, Number(val));
    setSplitRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, amount: numericVal } : row))
    );
  };

  // Helper: Split equally among all rows
  const handleEqualSplit = () => {
    if (splitRows.length === 0) return;
    const count = splitRows.length;
    const base = Math.floor(itemTotal / count);
    const remainder = itemTotal - (base * count);

    setSplitRows((prev) =>
      prev.map((row, idx) => ({
        ...row,
        amount: idx === 0 ? base + remainder : base,
      }))
    );
  };

  // Helper: Auto fill remaining amount into this row
  const handleAutoFillRemaining = (index: number) => {
    const sumOthers = splitRows
      .filter((_, idx) => idx !== index)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const fillValue = Math.max(0, itemTotal - sumOthers);
    setSplitRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, amount: fillValue } : row))
    );
  };

  // Helper: Reset to single staff
  const handleResetSingle = () => {
    const leadId = splitRows[0]?.staff_id || staff[0]?.id || "";
    setSplitRows([{ staff_id: leadId, amount: itemTotal }]);
  };

  // Calculate incentive for a specific split row
  const calculateRowIncentive = (staffId: string, rowAmount: number | string) => {
    const numAmount = Number(rowAmount) || 0;
    if (!staffId || numAmount <= 0) return { commission: 0, label: "" };

    const stylist = staff.find((s) => s.id === staffId);
    if (!stylist) return { commission: 0, label: "" };

    const rate = isProduct
      ? (stylist.product_commission_rate ?? stylist.commission_rate)
      : stylist.commission_rate;
    const type = isProduct
      ? (stylist.product_commission_type ?? stylist.commission_type ?? "percent")
      : (stylist.commission_type ?? "percent");

    if (type === "fixed") {
      const comm = itemTotal > 0 ? (rate * item.quantity * numAmount) / itemTotal : rate * item.quantity;
      return {
        commission: comm,
        label: `${formatCurrency(rate, settings.currency_symbol)} Flat`,
      };
    } else {
      const comm = (numAmount * rate) / 100;
      return {
        commission: comm,
        label: `${rate}% Rate`,
      };
    }
  };

  const handleConfirm = () => {
    // Validation 1: At least 1 stylist selected
    if (splitRows.length === 0 || !splitRows[0].staff_id) {
      alert("⚠️ Stylist Selection Required\n\nPlease select at least one stylist for this item.");
      return;
    }

    // Validation 2: All rows must have a stylist selected
    const unselectedRow = splitRows.findIndex((r) => !r.staff_id);
    if (unselectedRow !== -1) {
      alert(`⚠️ Incomplete Stylist\n\nPlease select a stylist for Stylist #${unselectedRow + 1} or remove the row.`);
      return;
    }

    // Validation 3: Mismatched amounts check
    if (!isBalanced) {
      const confirmMismatch = window.confirm(
        `⚠️ Total Amount Mismatch\n\nTotal Service Price: ${formatCurrency(itemTotal, settings.currency_symbol)}\nAllocated to Staff: ${formatCurrency(allocatedSum, settings.currency_symbol)}\n\nDo you want to save anyway?`
      );
      if (!confirmMismatch) return;
    }

    // Prepare staff_splits array
    const staffSplits: StaffSplitAssignment[] = splitRows.map((r) => {
      const stylist = staff.find((s) => s.id === r.staff_id);
      const amt = Number(r.amount) || 0;
      const ratio = itemTotal > 0 ? Math.round((amt / itemTotal) * 100) : 0;
      return {
        staff_id: r.staff_id,
        staff_name: stylist?.name,
        amount: amt,
        ratio,
      };
    });

    const primaryRow = splitRows[0];
    const secondaryRow = splitRows[1];

    const primaryRatio = itemTotal > 0 ? Math.round(((Number(primaryRow?.amount) || 0) / itemTotal) * 100) : 100;
    const secondaryRatio = itemTotal > 0 && secondaryRow ? Math.round(((Number(secondaryRow?.amount) || 0) / itemTotal) * 100) : 0;

    onSave({
      staff_splits: staffSplits,
      primary_staff_id: primaryRow?.staff_id || undefined,
      secondary_staff_id: secondaryRow ? secondaryRow.staff_id : undefined,
      primary_split_ratio: primaryRatio,
      secondary_split_ratio: secondaryRatio,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="2xl" className="max-w-2xl w-full p-0 overflow-hidden flex flex-col max-h-[90vh]">
      {/* FIXED HEADER */}
      <div className="p-4 sm:p-5 pb-3 border-b border-zinc-800 shrink-0 bg-zinc-900/90">
        <div className="flex items-center gap-3 pr-8">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Split Staff & Commission</h2>
            <p className="text-xs text-zinc-400 truncate">
              Assign staff members and custom amounts for <span className="text-white font-semibold">{item.item_name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* UNIFIED SMOOTH SCROLLABLE CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0 overscroll-contain">
        {/* ITEM PRICE & TALLIES CARD */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-inner space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Item / Service</span>
              <h4 className="text-sm sm:text-base font-extrabold text-white break-words mt-0.5 leading-snug">
                {item.item_name}
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 shrink-0">
              Qty: {item.quantity}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800/80">
            <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/70">
              <span className="text-[10px] text-zinc-400 font-semibold block uppercase tracking-wider">Total Value</span>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                {formatCurrency(itemTotal, settings.currency_symbol)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/70">
              <span className="text-[10px] text-zinc-400 font-semibold block uppercase tracking-wider">Allocated</span>
              <div
                className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                  isBalanced
                    ? "text-emerald-400"
                    : isOverallocated
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              >
                {formatCurrency(allocatedSum, settings.currency_symbol)}
              </div>
            </div>
          </div>
        </div>

        {/* STATUS BALANCE PILL & QUICK HELPERS */}
        <div className="space-y-2.5 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
          {/* BALANCE STATUS */}
          <div className="flex items-center gap-2 min-w-0">
            {isBalanced ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="truncate">100% Balanced ({formatCurrency(itemTotal, settings.currency_symbol)} split across {splitRows.length} staff)</span>
              </div>
            ) : isOverallocated ? (
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">Overallocated by {formatCurrency(Math.abs(remainingAmount), settings.currency_symbol)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 animate-pulse" />
                <span className="truncate">{formatCurrency(remainingAmount, settings.currency_symbol)} unallocated remaining</span>
              </div>
            )}
          </div>

          {/* QUICK DISTRIBUTION SHORTCUTS BAR */}
          {splitRows.length > 1 && (
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={handleEqualSplit}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title="Divide total equally among all staff"
              >
                <Scale className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>Equal Split (÷ {splitRows.length})</span>
              </button>

              <button
                type="button"
                onClick={handleResetSingle}
                className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
                title="Reset to 1 primary stylist"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* N-STAFF ROWS LIST (NATURAL FLOW WITHOUT NESTED SCROLL CONTAINERS) */}
        <div className="space-y-3">
          {splitRows.map((row, idx) => {
            const stylist = staff.find((s) => s.id === row.staff_id);
            const numAmount = Number(row.amount) || 0;
            const pct = itemTotal > 0 ? ((numAmount / itemTotal) * 100).toFixed(1) : "0";
            const rowIncentive = calculateRowIncentive(row.staff_id, row.amount);

            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 hover:border-purple-500/40 transition-all space-y-2.5 shadow-md"
              >
                {/* LINE 1: STYLIST SELECTOR & DELETE BUTTON */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md"
                    style={{ backgroundColor: stylist?.color || "#8b5cf6" }}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <select
                      value={row.staff_id}
                      onChange={(e) => handleStaffChange(idx, e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 truncate cursor-pointer"
                    >
                      <option value="">-- Select Stylist #{idx + 1} * --</option>
                      {staff.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={s.status === "on_leave" || s.status === "weekly_off" || s.status === "inactive"}
                        >
                          {s.name} ({s.role}){s.status === "half_day" ? " [Half Day]" : s.status === "on_leave" ? " [On Leave]" : s.status === "weekly_off" ? " [Off]" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {splitRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStylist(idx)}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer shrink-0"
                      title="Remove stylist from split"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* LINE 2: AMOUNT INPUT, PERCENTAGE & AUTO-FILL */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-zinc-900">
                  <div className="flex items-center gap-2 flex-1 min-w-[170px]">
                    <span className="text-xs font-semibold text-zinc-400 shrink-0">Split Amount:</span>
                    <div className="relative flex-1 max-w-[180px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        placeholder="0"
                        value={row.amount === "" ? "" : row.amount}
                        onChange={(e) => handleAmountChange(idx, e.target.value)}
                        className="w-full h-9 pl-7 pr-3 text-xs font-mono font-bold text-emerald-400 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* PERCENTAGE PILL */}
                    <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-purple-300 min-w-[56px] text-center">
                      {pct}%
                    </div>

                    {/* AUTO FILL BUTTON */}
                    {remainingAmount !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleAutoFillRemaining(idx)}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-700/60 text-xs text-purple-200 font-bold hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                        title="Auto-fill remaining unassigned amount into this stylist"
                      >
                        Auto-fill
                      </button>
                    )}
                  </div>
                </div>

                {/* LINE 3: INCENTIVE CALCULATION SUMMARY BAR FOR THIS ROW */}
                {stylist && (
                  <div className="flex items-center justify-between text-xs bg-purple-950/25 border border-purple-900/40 px-3 py-2 rounded-xl text-purple-200 flex-wrap gap-1">
                    <span className="text-zinc-400">
                      Commission Tier: <span className="text-purple-300 font-bold">{rowIncentive.label || "0%"}</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      Calculated Incentive: {formatCurrency(rowIncentive.commission, settings.currency_symbol)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ADD ANOTHER STYLIST BUTTON */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddStylist}
          className="w-full h-10 border-dashed border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900 text-purple-300 hover:text-white text-xs gap-1.5 font-bold cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Another Stylist to Split</span>
        </Button>
      </div>

      {/* FIXED PINNED FOOTER */}
      <div className="p-4 sm:p-5 pt-3 border-t border-zinc-800 shrink-0 bg-zinc-950/90 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="text-xs">
          Cancel
        </Button>
        <Button variant="glow" type="button" onClick={handleConfirm} className="gap-1.5 font-bold text-xs">
          <CheckCircle2 className="h-4 w-4" />
          <span>Apply Split Amount</span>
        </Button>
      </div>
    </Dialog>
  );
}
