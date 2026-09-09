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
  ShoppingBag,
  Package,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  getInvoiceRealizationFactor,
  calculateInvoiceProductSaleTotal,
} from "@/lib/calculations";
import { SalesBreakdownScope } from "@/lib/salesAnalytics";
import { Card } from "@/components/ui/card";
import { SalesBreakdownView } from "./SalesBreakdownView";

export function SalesOverview() {
  const { invoices, expenses, settings, staff, catalog, setActiveTab } = useApp();
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "all">("today");
  const [breakdownScope, setBreakdownScope] = useState<SalesBreakdownScope>("all");
  const [topItemsTab, setTopItemsTab] = useState<"services" | "products">("services");

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

  // Retail Product Sales KPIs
  const { retailProductSales, retailUnitsSold, retailInvoicesCount } = useMemo(() => {
    let sales = 0;
    let units = 0;
    let count = 0;

    filteredInvoices.forEach((inv) => {
      const pSale = calculateInvoiceProductSaleTotal(inv);
      const hasProduct = (inv.items || []).some((it) => it.item_type === "product");
      if (pSale > 0 || hasProduct) {
        sales += pSale;
        count += 1;
        const pUnits = (inv.items || [])
          .filter((it) => it.item_type === "product")
          .reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
        units += pUnits;
      }
    });

    return {
      retailProductSales: sales,
      retailUnitsSold: units,
      retailInvoicesCount: count,
    };
  }, [filteredInvoices]);

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

  // Top Items Breakdown (Services vs Products)
  const { topServices, topProducts } = useMemo(() => {
    const serviceMap = new Map<string, { name: string; type: string; count: number; revenue: number }>();
    const productMap = new Map<string, { name: string; type: string; count: number; revenue: number }>();

    filteredInvoices.forEach((inv) => {
      const factor = getInvoiceRealizationFactor(inv);
      inv.items.forEach((item) => {
        const itemNet =
          item.total_price !== undefined
            ? item.total_price
            : (item.unit_price || 0) * (item.quantity || 1) - (item.discount || 0);
        const realizedRevenue = itemNet * factor;

        if (item.item_type === "product") {
          const existing = productMap.get(item.item_name) || {
            name: item.item_name,
            type: "product",
            count: 0,
            revenue: 0,
          };
          existing.count += item.quantity || 1;
          existing.revenue += realizedRevenue;
          productMap.set(item.item_name, existing);
        } else {
          const existing = serviceMap.get(item.item_name) || {
            name: item.item_name,
            type: "service",
            count: 0,
            revenue: 0,
          };
          existing.count += item.quantity || 1;
          existing.revenue += realizedRevenue;
          serviceMap.set(item.item_name, existing);
        }
      });
    });

    return {
      topServices: Array.from(serviceMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    };
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
            Real-time daily collections, retail products sold, settled tickets, and cash drawer.
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

      {/* KPI METRIC CARDS (4-COLUMN LAYOUT WITH RETAIL PRODUCTS SALE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GROSS REVENUE */}
        <Card
          onClick={() => setBreakdownScope("all")}
          className={`cursor-pointer transition-all duration-200 hover:border-purple-500/50 ${
            breakdownScope === "all"
              ? "border-purple-500 ring-1 ring-purple-500/30 bg-gradient-to-br from-purple-950/40 via-purple-900/20 to-zinc-900/90"
              : "border-purple-500/20 bg-gradient-to-br from-purple-950/30 to-zinc-900/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300">Gross Sales</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {formatCurrency(grossSales, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
            <span>
              <span className="text-purple-400 font-bold">{filteredInvoices.length}</span> invoices
            </span>
            <span className="text-[10px] text-purple-400 hover:underline">View All →</span>
          </div>
        </Card>

        {/* RETAIL PRODUCTS SALE */}
        <Card
          onClick={() => setBreakdownScope("product")}
          className={`cursor-pointer transition-all duration-200 hover:border-pink-500/50 ${
            breakdownScope === "product"
              ? "border-pink-500 ring-1 ring-pink-500/30 bg-gradient-to-br from-pink-950/40 via-rose-900/20 to-zinc-900/90"
              : "border-pink-500/20 bg-gradient-to-br from-pink-950/30 to-zinc-900/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pink-300">Retail Products Sale</span>
            <div className="h-8 w-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shadow-inner">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-pink-300 font-mono">
            {formatCurrency(retailProductSales, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
            <span>
              <span className="text-pink-400 font-bold">{retailUnitsSold}</span> units sold ({retailInvoicesCount} bills)
            </span>
            <span className="text-[10px] text-pink-400 hover:underline">Breakdown →</span>
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

      {/* SECOND ROW: PAYMENT BREAKDOWN & TOP ITEMS (TREATMENTS vs RETAIL PRODUCTS) */}
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

        {/* TOP PERFORMING SERVICES & RETAIL PRODUCTS TABBED CARD */}
        <Card>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {topItemsTab === "services" ? (
                <>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Top Revenue Treatments
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4 text-pink-400" />
                  Top Selling Retail Products
                </>
              )}
            </h3>

            {/* TAB SWITCHER */}
            <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setTopItemsTab("services")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  topItemsTab === "services"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Treatments
              </button>
              <button
                type="button"
                onClick={() => setTopItemsTab("products")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  topItemsTab === "products"
                    ? "bg-pink-600 text-white font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Retail Products
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {topItemsTab === "services" ? (
              topServices.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No treatment sales in this period.</p>
              ) : (
                topServices.map((item, index) => (
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
              )
            ) : topProducts.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No retail product sales in this period.</p>
            ) : (
              topProducts.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-600/30 text-pink-300 text-[10px] font-bold font-mono">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {item.count} units sold
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-extrabold text-pink-400 font-mono">
                      {formatCurrency(item.revenue, settings.currency_symbol)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* PERIODIC SALES INTELLIGENCE: DAY-WISE (WEEK & MONTH) AND MONTH-WISE (YEAR) BREAKDOWN */}
      <SalesBreakdownView
        activeScope={breakdownScope}
        onScopeChange={setBreakdownScope}
      />
    </div>
  );
}
