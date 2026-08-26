"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiscountType, Invoice, PaymentMode, PaymentBreakdown } from "@/types";
import {
  Banknote,
  CreditCard,
  QrCode,
  Layers,
  Sparkles,
  Percent,
  Calculator,
  CheckCircle2,
  Receipt,
  FileText,
} from "lucide-react";
import { calculateInvoiceTotals } from "@/lib/calculations";
import { formatCurrency, generateInvoiceNumber, generateUUID } from "@/lib/utils";
import { normalizePhoneNumber } from "@/lib/customerUtils";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
  const {
    draftCustomer,
    setDraftCustomer,
    draftItems,
    draftDiscountType,
    setDraftDiscountType,
    draftDiscountValue,
    setDraftDiscountValue,
    draftNotes,
    setDraftNotes,
    clearDraft,
    createInvoice,
    setPrintInvoice,
    settings,
    customers,
    saveCustomer,
  } = useApp();

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [splitBreakdown, setSplitBreakdown] = useState<PaymentBreakdown>({
    cash: 0,
    upi: 0,
    card: 0,
  });

  // Calculate totals
  const totals = calculateInvoiceTotals({
    items: draftItems,
    discountType: draftDiscountType,
    discountValue: draftDiscountValue,
    taxEnabled: settings.tax_enabled,
    taxRate: settings.tax_rate,
  });

  // Calculate change for cash
  const cashGiven = Number(cashTendered) || 0;
  const changeDue = Math.max(0, cashGiven - totals.grandTotal);

  // Initialize split breakdown when grand total changes
  useEffect(() => {
    if (paymentMode === "split") {
      const half = Math.floor(totals.grandTotal / 2);
      setSplitBreakdown({
        cash: half,
        upi: totals.grandTotal - half,
        card: 0,
      });
    }
  }, [paymentMode, totals.grandTotal]);

  // UPI payment QR string (Standard Indian NPCI UPI intent)
  const upiIntentString = `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(
    settings.salon_name
  )}&am=${totals.grandTotal}&cu=${settings.currency_code}&tn=${encodeURIComponent(
    `Salon Invoice for ${draftCustomer?.name || "Client"}`
  )}`;

  const hasNamedCustomer = Boolean(
    draftCustomer?.name &&
    draftCustomer.name.trim() !== "" &&
    draftCustomer.name.toLowerCase() !== "walk-in guest"
  );

  const handleCheckout = async () => {
    if (draftItems.length === 0) return;

    // VALIDATE STYLIST FOR EVERY SERVICE & ALL PACKAGE SERVICES
    const unassignedItems: string[] = [];
    draftItems.forEach((item) => {
      if (item.item_type === "service" && !item.primary_staff_id) {
        unassignedItems.push(`• ${item.item_name}`);
      } else if (item.item_type === "package") {
        if (item.package_services && item.package_services.length > 0) {
          const missing = item.package_services.filter((s) => !s.primary_staff_id);
          if (missing.length > 0) {
            unassignedItems.push(
              `• ${item.item_name} (Missing stylist for: ${missing.map((s) => s.service_name).join(", ")})`
            );
          }
        } else if (!item.primary_staff_id) {
          unassignedItems.push(`• ${item.item_name}`);
        }
      }
    });

    if (unassignedItems.length > 0) {
      alert(
        `⚠️ Stylist Selection Required\n\nPlease select a stylist for each service before completing payment:\n\n${unassignedItems.join(
          "\n"
        )}`
      );
      onOpenChange(false);
      return;
    }

    // VALIDATE GENDER MANDATORY FOR EVERY BILL
    if (!draftCustomer?.gender || draftCustomer.gender === "unspecified") {
      alert(
        "⚠️ Customer Gender Required\n\nPlease select the customer gender (👩 Female, 👨 Male, or ⚧ Other) before completing payment."
      );
      return;
    }

    const invoiceNumber = generateInvoiceNumber(settings.invoice_prefix);

    const chosenGender = draftCustomer?.gender || "female";

    const cleanPhone = normalizePhoneNumber(draftCustomer?.phone);
    let savedCustomerId = draftCustomer?.id;

    // Save customer profile with updated gender
    if (cleanPhone && cleanPhone.length >= 7) {
      const matchedCust = customers.find(
        (c) =>
          (draftCustomer?.id && c.id === draftCustomer.id) ||
          (cleanPhone.length >= 7 && normalizePhoneNumber(c.phone) === cleanPhone)
      );

      const savedCust = await saveCustomer({
        id: matchedCust?.id || draftCustomer?.id || generateUUID(),
        name: draftCustomer?.name?.trim() || matchedCust?.name || `Guest (${cleanPhone})`,
        phone: cleanPhone.length === 10 ? cleanPhone : (draftCustomer?.phone || matchedCust?.phone || ""),
        email: draftCustomer?.email || matchedCust?.email || undefined,
        gender: chosenGender,
        birthday: draftCustomer?.birthday || matchedCust?.birthday || undefined,
        notes: draftCustomer?.notes || matchedCust?.notes || undefined,
        total_visits: (matchedCust?.total_visits || 0) + 1,
        total_spent: (matchedCust?.total_spent || 0) + totals.grandTotal,
        last_visit: new Date().toISOString(),
        created_at: matchedCust?.created_at || draftCustomer?.created_at || new Date().toISOString(),
      });
      if (savedCust?.id) savedCustomerId = savedCust.id;
    }

    const newInvoice: Invoice = {
      id: generateUUID(),
      invoice_number: invoiceNumber,
      customer_id: savedCustomerId,
      customer_name: draftCustomer?.name?.trim() || "Walk-in Guest",
      customer_phone: draftCustomer?.phone || "",
      customer_email: draftCustomer?.email || "",
      customer_gender: chosenGender,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      discount_type: draftDiscountType,
      discount_value: draftDiscountValue,
      tax_amount: totals.taxAmount,
      tax_rate: settings.tax_enabled ? settings.tax_rate : 0,
      grand_total: totals.grandTotal,
      payment_mode: paymentMode,
      payment_breakdown: paymentMode === "split" ? splitBreakdown : undefined,
      status: "paid",
      notes: draftNotes,
      created_at: new Date().toISOString(),
      items: draftItems.map((item) => ({
        ...item,
        id: generateUUID(),
      })),
    };

    // Save invoice
    const saved = createInvoice(newInvoice);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#ec4899", "#10b981", "#fbbf24"],
      });
    } catch {
      // ignore
    }

    // Reset draft and close modal
    clearDraft();
    onOpenChange(false);

    // Open Print Modal with saved invoice
    setPrintInvoice(saved);
  };

  const splitTotal =
    (splitBreakdown.cash || 0) +
    (splitBreakdown.upi || 0) +
    (splitBreakdown.card || 0);

  const isSplitBalanced = Math.abs(splitTotal - totals.grandTotal) < 1;
  const isGenderSet = Boolean(draftCustomer?.gender && draftCustomer.gender !== "unspecified");

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="2xl">
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Payment & Billing Settlement</DialogTitle>
            <DialogDescription>
              Client: <span className="text-white font-semibold">{draftCustomer?.name || "Walk-in Guest"}</span> ({draftCustomer?.phone || "No phone"})
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {/* GENDER & CLIENT SELECTOR BANNER - MANDATORY FOR EVERY BILL */}
      <div
        className={`mt-3 p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
          !isGenderSet
            ? "bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-900/20"
            : "bg-zinc-950/80 border-zinc-800"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{!isGenderSet ? "⚠️" : "👤"}</span>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Customer Gender</span>
              <span className="text-rose-400 font-bold">* (Mandatory)</span>
            </div>
            <div className="text-[11px] text-zinc-400">
              {!isGenderSet
                ? "Please select gender before proceeding with payment"
                : `Selected: ${draftCustomer?.gender?.toUpperCase()}`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-full sm:w-auto">
          {[
            { id: "female", label: "Female", emoji: "👩" },
            { id: "male", label: "Male", emoji: "👨" },
            { id: "other", label: "Other", emoji: "⚧" },
          ].map((g) => {
            const isSelected = draftCustomer?.gender === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  const newGender = g.id as any;
                  const updatedDraft = draftCustomer ? { ...draftCustomer, gender: newGender } : { gender: newGender };
                  setDraftCustomer(updatedDraft);

                  if (
                    draftCustomer?.name?.trim() &&
                    draftCustomer?.phone &&
                    draftCustomer.phone.replace(/\D/g, "").length >= 7
                  ) {
                    const cleanP = normalizePhoneNumber(draftCustomer.phone);
                    const matched = customers.find(
                      (c) =>
                        (draftCustomer?.id && c.id === draftCustomer.id) ||
                        (cleanP.length >= 7 && normalizePhoneNumber(c.phone) === cleanP)
                    );
                    saveCustomer({
                      id: matched?.id || draftCustomer.id || generateUUID(),
                      name: draftCustomer.name.trim(),
                      phone: cleanP,
                      gender: newGender,
                      email: draftCustomer.email || matched?.email,
                      birthday: draftCustomer.birthday || matched?.birthday,
                      notes: draftCustomer.notes || matched?.notes,
                      total_visits: matched?.total_visits || 1,
                      total_spent: matched?.total_spent || totals.grandTotal,
                      created_at: matched?.created_at || draftCustomer.created_at || new Date().toISOString(),
                    });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-sm font-black scale-105"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <span>{g.emoji}</span>
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
        {/* LEFT COLUMN: TOTALS, DISCOUNTS & TAX */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Bill Summary
            </h4>

            {/* SUBTOTAL */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Items Subtotal ({draftItems.length} items)</span>
              <span className="font-mono text-zinc-200 font-bold">
                {formatCurrency(totals.subtotal, settings.currency_symbol)}
              </span>
            </div>

            {/* INVOICE DISCOUNT */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Percent className="h-3 w-3 text-rose-400" />
                  Bill Discount:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDraftDiscountType("flat")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      draftDiscountType === "flat"
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {settings.currency_symbol}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftDiscountType("percentage")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      draftDiscountType === "percentage"
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    %
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={draftDiscountValue === 0 ? "" : draftDiscountValue}
                    onChange={(e) => setDraftDiscountValue(e.target.value === "" ? 0 : Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-16 h-6 px-1.5 text-xs text-right bg-zinc-900 border border-zinc-800 rounded text-rose-300 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-rose-400 font-mono">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(totals.discountAmount, settings.currency_symbol)}</span>
                </div>
              )}
            </div>

            {/* TAX (GST) */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-900">
              <span className="text-zinc-400">
                GST / Tax {settings.tax_enabled ? `(${settings.tax_rate}%)` : "(Disabled)"}
              </span>
              <span className="font-mono text-zinc-300">
                +{formatCurrency(totals.taxAmount, settings.currency_symbol)}
              </span>
            </div>

            {/* GRAND TOTAL */}
            <div className="flex items-baseline justify-between pt-3 border-t border-zinc-800/80">
              <span className="text-sm font-extrabold text-white">Grand Total</span>
              <div className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                {formatCurrency(totals.grandTotal, settings.currency_symbol)}
              </div>
            </div>
          </div>

          {/* INVOICE REMARKS / NOTES */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
              Invoice Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Next appointment recommended in 4 weeks"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              className="w-full h-8 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: PAYMENT MODE SELECTION & INTERACTIVE QR / CASH */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Select Payment Mode
            </label>

            {/* PAYMENT MODE PILLS */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "upi", label: "UPI / QR Code", icon: QrCode, color: "border-purple-500 text-purple-300" },
                { id: "cash", label: "Cash", icon: Banknote, color: "border-emerald-500 text-emerald-300" },
                { id: "card", label: "Card POS", icon: CreditCard, color: "border-blue-500 text-blue-300" },
                { id: "split", label: "Split Pay", icon: Layers, color: "border-amber-500 text-amber-300" },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id as PaymentMode)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                        : "bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-zinc-400"}`} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC MODE DETAILS */}
          {/* UPI DYNAMIC QR */}
          {paymentMode === "upi" && (
            <div className="rounded-2xl border border-purple-800/40 bg-purple-950/20 p-3.5 flex flex-col items-center text-center animate-in fade-in duration-200">
              <span className="text-xs font-bold text-purple-300 mb-1">
                Scan & Pay Instant UPI
              </span>
              <p className="text-[11px] text-zinc-400 mb-2.5">
                Amount {formatCurrency(totals.grandTotal, settings.currency_symbol)} auto-filled for client
              </p>

              {/* QR CODE */}
              <div className="bg-white p-2.5 rounded-xl shadow-lg">
                <QRCodeSVG
                  value={upiIntentString}
                  size={128}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-[10px] text-zinc-500 mt-2 font-mono">
                VPA: {settings.upi_id}
              </div>
            </div>
          )}

          {/* CASH TENDERED & CHANGE CALCULATOR */}
          {paymentMode === "cash" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2.5 animate-in fade-in duration-200">
              <span className="text-xs font-bold text-emerald-400 block">
                Cash Calculator
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    Cash Tendered
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                      {settings.currency_symbol}
                    </span>
                    <input
                      type="number"
                      placeholder={totals.grandTotal.toString()}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full h-9 pl-6 pr-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    Change to Return
                  </label>
                  <div className="h-9 px-3 flex items-center justify-between rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono font-bold text-sm text-emerald-400">
                    <span>{settings.currency_symbol}</span>
                    <span>{changeDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* QUICK CASH DENOMINATION CHIPS */}
              <div className="flex items-center gap-1.5 pt-1">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt.toString())}
                    className="flex-1 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 border border-zinc-800"
                  >
                    {settings.currency_symbol}{amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CARD POS */}
          {paymentMode === "card" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-center space-y-2 animate-in fade-in duration-200">
              <CreditCard className="h-8 w-8 text-blue-400 mx-auto opacity-70" />
              <div className="text-xs font-bold text-white">
                Swipe / Tap on POS Terminal
              </div>
              <p className="text-[11px] text-zinc-400">
                Charge <strong className="text-emerald-400 font-mono">{formatCurrency(totals.grandTotal, settings.currency_symbol)}</strong> on your EDC Card Machine (PineLabs / HDFC / Paytm).
              </p>
            </div>
          )}

          {/* SPLIT PAYMENT */}
          {paymentMode === "split" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300">Split Breakdown</span>
                <span className={`font-mono text-[11px] font-bold ${isSplitBalanced ? "text-emerald-400" : "text-rose-400"}`}>
                  Total: {formatCurrency(splitTotal, settings.currency_symbol)} / {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Cash</label>
                  <input
                    type="number"
                    value={splitBreakdown.cash === 0 ? "" : splitBreakdown.cash}
                    onChange={(e) =>
                      setSplitBreakdown({ ...splitBreakdown, cash: e.target.value === "" ? 0 : Number(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">UPI</label>
                  <input
                    type="number"
                    value={splitBreakdown.upi === 0 ? "" : splitBreakdown.upi}
                    onChange={(e) =>
                      setSplitBreakdown({ ...splitBreakdown, upi: e.target.value === "" ? 0 : Number(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Card</label>
                  <input
                    type="number"
                    value={splitBreakdown.card === 0 ? "" : splitBreakdown.card}
                    onChange={(e) =>
                      setSplitBreakdown({ ...splitBreakdown, card: e.target.value === "" ? 0 : Number(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Back
        </Button>
        <Button
          variant="glow"
          size="lg"
          onClick={handleCheckout}
          disabled={draftItems.length === 0 || (paymentMode === "split" && !isSplitBalanced)}
          className="w-full sm:w-auto"
        >
          <Receipt className="h-4 w-4 mr-1.5" />
          Complete & Print Receipt
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
