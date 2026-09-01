"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { CustomerSelector } from "./CustomerSelector";
import { CatalogGrid } from "./CatalogGrid";
import { CartItemList } from "./CartItemList";
import { PaymentModal } from "./PaymentModal";
import { calculateInvoiceTotals } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Trash2,
  CreditCard,
  Sparkles,
  ShoppingBag,
  Scissors,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

export function BillingPos() {
  const {
    draftCustomer,
    draftItems,
    draftDiscountType,
    draftDiscountValue,
    clearDraft,
    settings,
  } = useApp();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"catalog" | "ticket">("catalog");

  // Compute live totals
  const totals = calculateInvoiceTotals({
    items: draftItems,
    discountType: draftDiscountType,
    discountValue: draftDiscountValue,
    taxEnabled: settings.tax_enabled,
    taxRate: settings.tax_rate,
  });

  const handleOpenPayment = () => {
    if (draftItems.length === 0) return;
    setIsPaymentOpen(true);
  };

  return (
    <div className="max-w-[1700px] mx-auto w-full">
      {/* =========================================================================
          MOBILE / TABBED VIEW SWITCHER (ONLY VISIBLE ON SCREENS < XL)
          ========================================================================= */}
      <div
        className={`flex xl:hidden items-center bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800/90 mb-3 shadow-lg w-full transition-all duration-200 ${
          mobileTab === "ticket" ? "max-w-2xl mx-auto" : "max-w-5xl mx-auto"
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileTab("catalog")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            mobileTab === "catalog"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>1. Services & Client</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("ticket")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            mobileTab === "ticket"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>2. Ticket</span>
          {draftItems.length > 0 && (
            <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-extrabold text-white font-mono animate-pulse">
              {draftItems.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          MAIN LAYOUT CONTAINER
          ========================================================================= */}
      <div className="flex flex-col xl:flex-row gap-3.5 xl:h-[calc(100dvh-5.5rem)] pb-2 xl:pb-0">
        
        {/* =====================================================================
            LEFT COLUMN: CLIENT SELECTOR + CATALOG GRID
            ===================================================================== */}
        <div
          className={`flex-1 flex flex-col gap-3.5 min-h-0 min-w-0 max-w-5xl mx-auto w-full xl:max-w-none ${
            mobileTab === "ticket" ? "hidden xl:flex" : "flex"
          }`}
        >
          {/* CLIENT SELECTOR FORM */}
          <CustomerSelector />

          {/* SERVICES & RETAIL CATALOG */}
          <div className="flex-1 min-h-[450px] xl:min-h-0">
            <CatalogGrid />
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN: CURRENT INVOICE / CART TICKET
            ===================================================================== */}
        <div
          className={`w-full max-w-2xl mx-auto xl:max-w-none xl:w-[380px] 2xl:w-[450px] flex flex-col rounded-2xl border border-zinc-800/90 bg-zinc-900/80 backdrop-blur-xl shadow-2xl overflow-hidden shrink-0 ${
            mobileTab === "catalog"
              ? "hidden xl:flex"
              : "flex h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-9.5rem)] min-h-[420px] xl:h-full"
          }`}
        >
          {/* CART HEADER */}
          <div className="shrink-0 flex items-center justify-between p-3.5 sm:p-4 border-b border-zinc-800/80 bg-zinc-950/60">
            <div className="flex items-center gap-2">
              {/* Back to Catalog on Mobile */}
              <button
                type="button"
                onClick={() => setMobileTab("catalog")}
                className="xl:hidden flex items-center justify-center h-8 w-8 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white mr-1"
                title="Back to Catalog"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Current Ticket
                  <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-extrabold text-white font-mono">
                    {draftItems.length}
                  </span>
                </h3>
                <span className="text-[10px] text-zinc-400">
                  {draftCustomer?.name ? `Client: ${draftCustomer.name}` : "Walk-in Guest"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Add more button for mobile ticket view */}
              <button
                type="button"
                onClick={() => setMobileTab("catalog")}
                className="xl:hidden flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 py-1 px-2 rounded-lg bg-purple-950/40 border border-purple-800/40"
              >
                <span>+ Add Items</span>
              </button>

              {draftItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to clear this billing draft?")) {
                      clearDraft();
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-950/30"
                  title="Clear Draft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* CART ITEMS SCROLLABLE LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">
            <CartItemList />
          </div>

          {/* CART FOOTER / TOTALS & CHECKOUT ACTIONS */}
          <div className="shrink-0 p-3.5 sm:p-4 border-t border-zinc-800/90 bg-zinc-950/95 space-y-2.5 sm:space-y-3 sticky bottom-0 z-10 shadow-2xl backdrop-blur-md">
            {/* TOTALS MINI SUMMARY */}
            <div className="space-y-1.5 text-xs">
              {totals.productsSubtotal > 0 && (
                <>
                  <div className="flex justify-between text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3 w-3 text-indigo-400" />
                      <span>Services Subtotal</span>
                    </span>
                    <span className="font-mono text-zinc-300">
                      {formatCurrency(totals.servicesSubtotal, settings.currency_symbol)}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3 text-pink-400" />
                      <span>Retail Products Subtotal</span>
                    </span>
                    <span className="font-mono text-pink-300">
                      {formatCurrency(totals.productsSubtotal, settings.currency_symbol)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono text-zinc-200">
                  {formatCurrency(totals.subtotal, settings.currency_symbol)}
                </span>
              </div>

              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-rose-400 font-mono">
                  <span>Discount</span>
                  <span>-{formatCurrency(totals.discountAmount, settings.currency_symbol)}</span>
                </div>
              )}

              {settings.tax_enabled && (
                <div className="flex justify-between text-zinc-400">
                  <span>GST ({settings.tax_rate}%)</span>
                  <span className="font-mono text-zinc-300">
                    +{formatCurrency(totals.taxAmount, settings.currency_symbol)}
                  </span>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-2 border-t border-zinc-800">
                <div>
                  <span className="text-sm font-bold text-white block">Net Payable</span>
                  <span className="text-[10px] text-zinc-500">Incl. all taxes</span>
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 pt-0.5">
              <Button
                variant="glow"
                size="lg"
                onClick={handleOpenPayment}
                disabled={draftItems.length === 0}
                className="flex-1 text-sm font-bold h-11 sm:h-12"
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Collect & Settle ({formatCurrency(totals.grandTotal, settings.currency_symbol)})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FLOATING BOTTOM QUICK-CHECKOUT PILL (ON MOBILE WHEN IN CATALOG TAB)
          ========================================================================= */}
      {mobileTab === "catalog" && draftItems.length > 0 && (
        <div className="xl:hidden fixed bottom-18 lg:bottom-6 left-3 right-3 z-30 animate-in slide-in-from-bottom-4 duration-300 max-w-md mx-auto pointer-events-none">
          <div className="pointer-events-auto flex items-center justify-between p-3 rounded-2xl bg-zinc-900/95 border border-purple-500/50 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white font-mono font-bold text-xs shadow-md shadow-purple-600/40">
                {draftItems.length}
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {draftItems.length} {draftItems.length === 1 ? "Item" : "Items"} in Ticket
                </div>
                <div className="text-xs font-black text-emerald-400 font-mono">
                  {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="glow"
              onClick={() => setMobileTab("ticket")}
              className="text-xs font-bold h-9 px-4 flex items-center gap-1"
            >
              <span>Review Ticket</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      <PaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
      />
    </div>
  );
}
