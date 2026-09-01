"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Wallet,
  Percent,
  Calendar,
  Sparkles,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Banknote,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function SalesOverview() {
  const { invoices, expenses, settings, staff, catalog, setActiveTab } = useApp();
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "all">("today");

  // Filter invoices and expenses by timeframe
  const { filteredInvoices, filteredExpenses } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 86400000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const fInvoices = invoices.filter((inv) => {
      if (inv.status === "void") return false;
      const invTime = new Date(inv.created_at).getTime();
      if (timeframe === "today") return invTime >= startOfToday;
      if (timeframe === "week") return invTime >= startOfWeek;
      if (timeframe === "month") return invTime >= startOfMonth;
      return true;
    });

    const fExpenses = expenses.filter((exp) => {
      const expTime = new Date(exp.expense_date).getTime();
      if (timeframe === "today") return expTime >= startOfToday;
      if (timeframe === "week") return expTime >= startOfWeek;
      if (timeframe === "month") return expTime >= startOfMonth;
      return true;
    });

    return { filteredInvoices: fInvoices, filteredExpenses: fExpenses };
  }, [invoices, expenses, timeframe]);

  // Compute KPIs
  const grossSales = filteredInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalSubtotal = filteredInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalDiscounts = filteredInvoices.reduce((sum, inv) => sum + inv.discount_amount, 0);
  const totalTaxes = filteredInvoices.reduce((sum, inv) => sum + inv.tax_amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = grossSales - totalExpenses;
  const profitMargin = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : "0";

  // Payment Mode Breakdown
  const paymentBreakdown = useMemo(() => {
    const counts = { upi: 0, cash: 0, card: 0, split: 0 };
    filteredInvoices.forEach((inv) => {
      if (counts[inv.payment_mode] !== undefined) {
        counts[inv.payment_mode] += inv.grand_total;
      }
    });
    return counts;
  }, [filteredInvoices]);

  // Top Services Breakdown
  const topItems = useMemo(() => {
    const itemMap = new Map<string, { name: string; type: string; count: number; revenue: number }>();
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const existing = itemMap.get(item.item_name) || {
          name: item.item_name,
          type: item.item_type,
          count: 0,
          revenue: 0,
        };
        existing.count += item.quantity;
        existing.revenue += item.total_price;
        itemMap.set(item.item_name, existing);
      });
    });
    return Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      {/* TIMEFRAME FILTER PILLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <span>Today's Daily Register & Shift Dashboard</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time daily collections, settled tickets, today's cash drawer, and shift expenses.
          </p>
        </div>

        {/* TIMEFRAME SELECTOR */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeframe(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeframe === tab.id
                    ? "bg-purple-600 text-white shadow-sm font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className="flex items-center gap-1 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/80 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            title="Open Master All-Time Business Analytics in Admin Portal"
          >
            <span>All Data Analytics</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS (3-COLUMN LAYOUT) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GROSS REVENUE */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-950/30 to-zinc-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300">Gross Sales</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {formatCurrency(grossSales, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className="text-purple-400 font-bold">{filteredInvoices.length}</span> invoices settled
          </div>
        </Card>

        {/* EXPENSES */}
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/30 to-zinc-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Total Expenses</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300 font-mono">
            {formatCurrency(totalExpenses, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {filteredExpenses.length} expense transactions
          </div>
        </Card>

        {/* NET PROFIT */}
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-zinc-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300">Net Salon Profit</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(netProfit, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <span>{profitMargin}% net margin</span>
          </div>
        </Card>
      </div>

      {/* SECOND ROW: PAYMENT BREAKDOWN & TOP TREATMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PAYMENT CHANNELS DISTRIBUTION */}
        <Card>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-400" />
            Payment Channel Breakdown
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/30 text-center">
              <QrCode className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <span className="text-[10px] text-zinc-400 uppercase font-bold">UPI / QR</span>
              <div className="text-xs font-bold text-purple-300 font-mono mt-0.5">
                {formatCurrency(paymentBreakdown.upi, settings.currency_symbol)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-center">
              <Banknote className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Cash</span>
              <div className="text-xs font-bold text-emerald-300 font-mono mt-0.5">
                {formatCurrency(paymentBreakdown.cash, settings.currency_symbol)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/30 text-center">
              <CreditCard className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Card POS</span>
              <div className="text-xs font-bold text-blue-300 font-mono mt-0.5">
                {formatCurrency(paymentBreakdown.card, settings.currency_symbol)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/30 text-center">
              <Layers className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Split Pay</span>
              <div className="text-xs font-bold text-amber-300 font-mono mt-0.5">
                {formatCurrency(paymentBreakdown.split, settings.currency_symbol)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex justify-between">
            <span>Total Discounts Given:</span>
            <span className="text-rose-400 font-mono font-bold">
              -{formatCurrency(totalDiscounts, settings.currency_symbol)}
            </span>
          </div>
        </Card>

        {/* TOP PERFORMING SERVICES & RETAIL */}
        <Card>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Top Revenue Generating Treatments
          </h3>

          <div className="space-y-2.5">
            {topItems.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No service sales in this period.</p>
            ) : (
              topItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600/30 text-purple-300 text-[10px] font-bold font-mono">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {item.count} orders booked
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-extrabold text-emerald-400 font-mono">
                      {formatCurrency(item.revenue, settings.currency_symbol)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
