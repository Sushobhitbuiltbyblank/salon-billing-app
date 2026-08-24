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
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="lg">
      <DialogHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Split Staff & Commission by Amount</DialogTitle>
              <DialogDescription>
                Assign multiple staff members and allocate custom ₹ amounts for <span className="text-white font-semibold">{item.item_name}</span>
              </DialogDescription>
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        {/* ITEM PRICE & LIVE ALLOCATION BANNER */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-zinc-400 font-medium">Billed Item Total</span>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{item.item_name}</span>
              <span className="text-xs font-mono text-zinc-400">(Qty: {item.quantity})</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Total Value</span>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {formatCurrency(itemTotal, settings.currency_symbol)}
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Total Allocated</span>
              <div
                className={`text-lg font-black font-mono ${
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
          {/* BALANCE STATUS */}
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>100% Balanced ({formatCurrency(itemTotal, settings.currency_symbol)} allocated across {splitRows.length} staff)</span>
              </div>
            ) : isOverallocated ? (
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>Overallocated by {formatCurrency(Math.abs(remainingAmount), settings.currency_symbol)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertCircle className="h-4 w-4 animate-pulse" />
                <span>{formatCurrency(remainingAmount, settings.currency_symbol)} remaining unallocated</span>
              </div>
            )}
          </div>

          {/* QUICK DISTRIBUTION SHORTCUTS */}
          <div className="flex items-center gap-1.5">
            {splitRows.length > 1 && (
              <button
                type="button"
                onClick={handleEqualSplit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                title="Divide total equally among all staff"
              >
                <Scale className="h-3 w-3 text-purple-400" />
                <span>Equal Split (÷ {splitRows.length})</span>
              </button>
            )}

            {splitRows.length > 1 && (
              <button
                type="button"
                onClick={handleResetSingle}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors cursor-pointer"
                title="Reset to 1 primary stylist"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* N-STAFF ROWS LIST */}
        <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
          {splitRows.map((row, idx) => {
            const stylist = staff.find((s) => s.id === row.staff_id);
            const numAmount = Number(row.amount) || 0;
            const pct = itemTotal > 0 ? ((numAmount / itemTotal) * 100).toFixed(1) : "0";
            const rowIncentive = calculateRowIncentive(row.staff_id, row.amount);

            return (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 hover:border-purple-500/40 transition-all space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* STYLIST SELECTOR */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md"
                      style={{ backgroundColor: stylist?.color || "#8b5cf6" }}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1">
                      <select
                        value={row.staff_id}
                        onChange={(e) => handleStaffChange(idx, e.target.value)}
                        className="w-full h-9 px-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                  </div>

                  {/* AMOUNT INPUT & PERCENTAGE */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-zinc-400">Amount:</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          placeholder="0"
                          value={row.amount === "" ? "" : row.amount}
                          onChange={(e) => handleAmountChange(idx, e.target.value)}
                          className="w-full h-9 pl-6 pr-2 text-xs font-mono font-bold text-emerald-400 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* PERCENTAGE PILL */}
                    <div className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-bold text-purple-300 min-w-[50px] text-center">
                      {pct}%
                    </div>

                    {/* AUTO FILL BUTTON IF REMAINING */}
                    {remainingAmount !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleAutoFillRemaining(idx)}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-amber-400 font-bold hover:text-amber-300 transition-colors"
                        title="Auto-fill remaining balance into this stylist"
                      >
                        Auto-fill
                      </button>
                    )}

                    {/* REMOVE BUTTON */}
                    {splitRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStylist(idx)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                        title="Remove stylist from split"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* INCENTIVE CALCULATION SUMMARY BAR FOR THIS ROW */}
                {stylist && (
                  <div className="flex items-center justify-between text-[11px] bg-purple-950/20 border border-purple-900/30 px-3 py-1.5 rounded-xl text-purple-200">
                    <span className="text-zinc-400">
                      Tier: <span className="text-purple-300 font-semibold">{rowIncentive.label || "0%"}</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      Earned Commission: {formatCurrency(rowIncentive.commission, settings.currency_symbol)}
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
          className="w-full h-9 border-dashed border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900 text-purple-300 hover:text-white text-xs gap-1.5 font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Another Stylist to Split</span>
        </Button>
      </div>

      <DialogFooter className="mt-4 border-t border-zinc-800/80 pt-3">
        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="glow" type="button" onClick={handleConfirm} className="gap-1.5 font-bold">
          <CheckCircle2 className="h-4 w-4" />
          <span>Apply Split Amount</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
