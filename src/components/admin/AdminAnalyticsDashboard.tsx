"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Wallet,
  Percent,
  Download,
  Printer,
  Calendar,
  Sparkles,
  ShoppingBag,
  Scissors,
  Layers,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Banknote,
  Award,
  Filter,
  CheckCircle2,
} from "lucide-react";

export function AdminAnalyticsDashboard() {
  const { invoices, expenses, catalog, staff, categories, settings } = useApp();

  const [timeframe, setTimeframe] = useState<
    "all" | "year" | "quarter" | "month" | "last_month" | "30days" | "7days" | "today" | "custom"
  >("all");

  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // FILTER INVOICES & EXPENSES BASED ON SELECTED TIMEFRAME
  const { filteredInvoices, filteredExpenses } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOf7Days = new Date(now.getTime() - 7 * 86400000).getTime();
    const startOf30Days = new Date(now.getTime() - 30 * 86400000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    const fInvoices = invoices.filter((inv) => {
      if (inv.status === "void") return false;
      const invTime = new Date(inv.created_at).getTime();

      if (timeframe === "today") return invTime >= startOfToday;
      if (timeframe === "7days") return invTime >= startOf7Days;
      if (timeframe === "30days") return invTime >= startOf30Days;
      if (timeframe === "month") return invTime >= startOfMonth;
      if (timeframe === "last_month") return invTime >= startOfLastMonth && invTime <= endOfLastMonth;
      if (timeframe === "quarter") return invTime >= startOfQuarter;
      if (timeframe === "year") return invTime >= startOfYear;
      if (timeframe === "custom") {
        if (customStartDate && invTime < new Date(customStartDate).getTime()) return false;
        if (customEndDate && invTime > new Date(customEndDate + "T23:59:59").getTime()) return false;
        return true;
      }
      return true; // "all"
    });

    const fExpenses = expenses.filter((exp) => {
      const expTime = new Date(exp.expense_date).getTime();

      if (timeframe === "today") return expTime >= startOfToday;
      if (timeframe === "7days") return expTime >= startOf7Days;
      if (timeframe === "30days") return expTime >= startOf30Days;
      if (timeframe === "month") return expTime >= startOfMonth;
      if (timeframe === "last_month") return expTime >= startOfLastMonth && expTime <= endOfLastMonth;
      if (timeframe === "quarter") return expTime >= startOfQuarter;
      if (timeframe === "year") return expTime >= startOfYear;
      if (timeframe === "custom") {
        if (customStartDate && expTime < new Date(customStartDate).getTime()) return false;
        if (customEndDate && expTime > new Date(customEndDate + "T23:59:59").getTime()) return false;
        return true;
      }
      return true; // "all"
    });

    return { filteredInvoices: fInvoices, filteredExpenses: fExpenses };
  }, [invoices, expenses, timeframe, customStartDate, customEndDate]);

  // COMPUTE SUMMARY KPIS
  const kpis = useMemo(() => {
    const grossSales = filteredInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
    const subtotal = filteredInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
    const totalDiscounts = filteredInvoices.reduce((sum, inv) => sum + (inv.discount_amount || 0), 0);
    const totalTaxes = filteredInvoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // COGS & Retail vs Services Breakdown
    let totalCOGS = 0;
    let servicesRevenue = 0;
    let retailRevenue = 0;

    const catalogMap = new Map<string, number>();
    catalog.forEach((item) => {
      if (item.name) catalogMap.set(item.name.toLowerCase().trim(), item.cost_price || 0);
      if (item.id) catalogMap.set(item.id, item.cost_price || 0);
    });

    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        if (it.item_type === "product") {
          retailRevenue += it.total_price || 0;
          const cost = catalogMap.get(it.item_id || "") ?? catalogMap.get(it.item_name.toLowerCase().trim()) ?? 0;
          totalCOGS += cost * (it.quantity || 1);
        } else {
          servicesRevenue += it.total_price || 0;
        }
      });
    });

    const netProfit = grossSales - totalCOGS - totalExpenses;
    const profitMargin = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : "0";

    // Unique clients served
    const clientSet = new Set<string>();
    filteredInvoices.forEach((inv) => {
      const idOrName = inv.customer_phone?.trim() || inv.customer_name?.trim();
      if (idOrName && idOrName.toLowerCase() !== "walk-in guest") {
        clientSet.add(idOrName.toLowerCase());
      }
    });

    const avgTicket = filteredInvoices.length > 0 ? Math.round(grossSales / filteredInvoices.length) : 0;

    return {
      grossSales,
      subtotal,
      totalDiscounts,
      totalTaxes,
      totalExpenses,
      totalCOGS,
      servicesRevenue,
      retailRevenue,
      netProfit,
      profitMargin,
      uniqueClients: clientSet.size,
      invoiceCount: filteredInvoices.length,
      avgTicket,
    };
  }, [filteredInvoices, filteredExpenses, catalog]);

  // PAYMENT MODE BREAKDOWN
  const paymentBreakdown = useMemo(() => {
    const counts = { upi: 0, cash: 0, card: 0, split: 0 };
    filteredInvoices.forEach((inv) => {
      if (counts[inv.payment_mode] !== undefined) {
        counts[inv.payment_mode] += inv.grand_total || 0;
      }
    });
    return counts;
  }, [filteredInvoices]);

  // TOP SERVICES & TOP PRODUCTS
  const { topServices, topProducts } = useMemo(() => {
    const sMap = new Map<string, { name: string; count: number; revenue: number }>();
    const pMap = new Map<string, { name: string; count: number; revenue: number }>();

    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        const targetMap = it.item_type === "product" ? pMap : sMap;
        const key = it.item_name;
        const curr = targetMap.get(key) || { name: key, count: 0, revenue: 0 };
        curr.count += it.quantity || 1;
        curr.revenue += it.total_price || 0;
        targetMap.set(key, curr);
      });
    });

    return {
      topServices: Array.from(sMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      topProducts: Array.from(pMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    };
  }, [filteredInvoices]);

  // STAFF REVENUE LEADERBOARD
  const staffLeaderboard = useMemo(() => {
    const staffMap = new Map<
      string,
      { name: string; role: string; color: string; serviceRev: number; productRev: number; totalRev: number; count: number }
    >();

    staff.forEach((st) => {
      staffMap.set(st.id, {
        name: st.name,
        role: st.role || "Stylist",
        color: st.color || "#8b5cf6",
        serviceRev: 0,
        productRev: 0,
        totalRev: 0,
        count: 0,
      });
    });

    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        if (it.primary_staff_id && staffMap.has(it.primary_staff_id)) {
          const entry = staffMap.get(it.primary_staff_id)!;
          const ratio = (it.primary_split_ratio || 100) / 100;
          const itemRev = (it.total_price || 0) * ratio;

          if (it.item_type === "product") {
            entry.productRev += itemRev;
          } else {
            entry.serviceRev += itemRev;
          }
          entry.totalRev += itemRev;
          entry.count += 1;
        }

        if (it.secondary_staff_id && staffMap.has(it.secondary_staff_id)) {
          const entry = staffMap.get(it.secondary_staff_id)!;
          const ratio = (it.secondary_split_ratio || 0) / 100;
          const itemRev = (it.total_price || 0) * ratio;

          if (it.item_type === "product") {
            entry.productRev += itemRev;
          } else {
            entry.serviceRev += itemRev;
          }
          entry.totalRev += itemRev;
          entry.count += 1;
        }
      });
    });

    return Array.from(staffMap.values()).sort((a, b) => b.totalRev - a.totalRev);
  }, [filteredInvoices, staff]);

  // EXPORT MASTER ANALYTICS CSV
  const handleExportCSV = () => {
    const rows = [
      ["METRIC", "VALUE"],
      ["Timeframe", timeframe.toUpperCase()],
      ["Gross Sales", kpis.grossSales],
      ["Total Invoices Settled", kpis.invoiceCount],
      ["Unique Clients Served", kpis.uniqueClients],
      ["Services Revenue", kpis.servicesRevenue],
      ["Retail Products Revenue", kpis.retailRevenue],
      ["Cost of Goods Sold (COGS)", kpis.totalCOGS],
      ["Total Operating Expenses", kpis.totalExpenses],
      ["Net Salon Profit", kpis.netProfit],
      ["Profit Margin (%)", `${kpis.profitMargin}%`],
      ["Total Discounts Given", kpis.totalDiscounts],
      ["Total GST/Tax Collected", kpis.totalTaxes],
      ["UPI Collections", paymentBreakdown.upi],
      ["Cash Collections", paymentBreakdown.cash],
      ["Card Collections", paymentBreakdown.card],
      ["Split Collections", paymentBreakdown.split],
      [],
      ["STAFF PERFORMANCE", "TOTAL REVENUE PRODUCED", "SERVICES", "PRODUCTS", "SERVICES COUNT"],
      ...staffLeaderboard.map((s) => [s.name, s.totalRev, s.serviceRev, s.productRev, s.count]),
      [],
      ["TOP SERVICES", "BOOKING COUNT", "REVENUE"],
      ...topServices.map((s) => [s.name, s.count, s.revenue]),
      [],
      ["TOP RETAIL PRODUCTS", "UNITS SOLD", "REVENUE"],
      ...topProducts.map((p) => [p.name, p.count, p.revenue]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Belezia_Master_Analytics_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* HEADER WITH TIMEFRAME & EXPORT ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 p-0.5 shadow-lg shadow-purple-600/30 shrink-0">
            <div className="h-full w-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-purple-400">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Executive Business Analytics</span>
              <Badge variant="purple" className="text-[10px] font-mono py-0 px-2 font-bold">
                {timeframe === "all" ? "All Time Data" : timeframe.toUpperCase()}
              </Badge>
            </h2>
            <p className="text-xs text-zinc-400">
              Complete historical revenue intelligence, stylist production, profit margins, and retail reports.
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs text-purple-300 hover:text-white border-purple-800/80 hover:bg-purple-950/60 h-9 px-3 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs font-bold h-9 px-3 cursor-pointer shadow-md shadow-purple-600/20"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* TIMEFRAME SELECTOR BAR */}
      <div className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: "All Time (All Data)" },
            { id: "year", label: "This Year" },
            { id: "quarter", label: "This Quarter" },
            { id: "month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "30days", label: "Past 30 Days" },
            { id: "7days", label: "Past 7 Days" },
            { id: "today", label: "Today Only" },
            { id: "custom", label: "Custom Range" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                timeframe === t.id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CUSTOM DATE RANGE PICKER */}
        {timeframe === "custom" && (
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800 animate-in fade-in">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-8 px-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
            <span className="text-zinc-500 text-xs">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-8 px-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            />
          </div>
        )}
      </div>

      {/* MASTER KPI SUMMARY CARDS (6 GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* GROSS REVENUE */}
        <Card className="p-3.5 bg-gradient-to-br from-purple-950/40 via-zinc-950 to-zinc-900/90 border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Gross Revenue</span>
            <div className="h-7 w-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">
            {formatCurrency(kpis.grossSales, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            <span className="text-purple-400 font-bold">{kpis.invoiceCount}</span> invoices settled
          </div>
        </Card>

        {/* NET SALON PROFIT */}
        <Card className="p-3.5 bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-zinc-900/90 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Net Profit</span>
            <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400 font-mono">
            {formatCurrency(kpis.netProfit, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-emerald-300/80 mt-1 font-semibold">
            {kpis.profitMargin}% net profit margin
          </div>
        </Card>

        {/* SERVICES REVENUE */}
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Services Rev</span>
            <div className="h-7 w-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Scissors className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-indigo-300 font-mono">
            {formatCurrency(kpis.servicesRevenue, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            {kpis.grossSales > 0 ? ((kpis.servicesRevenue / kpis.grossSales) * 100).toFixed(0) : 0}% of sales
          </div>
        </Card>

        {/* RETAIL SALES */}
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Retail Products</span>
            <div className="h-7 w-7 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-pink-300 font-mono">
            {formatCurrency(kpis.retailRevenue, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            COGS: {formatCurrency(kpis.totalCOGS, settings.currency_symbol)}
          </div>
        </Card>

        {/* TOTAL EXPENSES */}
        <Card className="p-3.5 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-900/90 border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Expenses</span>
            <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-amber-300 font-mono">
            {formatCurrency(kpis.totalExpenses, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            {filteredExpenses.length} transactions
          </div>
        </Card>

        {/* UNIQUE CLIENTS */}
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Clients Served</span>
            <div className="h-7 w-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-blue-300">
            {kpis.uniqueClients}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            Avg ticket: {formatCurrency(kpis.avgTicket, settings.currency_symbol)}
          </div>
        </Card>
      </div>

      {/* COLLECTIONS & PAYMENT MODE BREAKDOWN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">UPI / QR Digital</span>
            <span className="text-base font-black text-white font-mono">
              {formatCurrency(paymentBreakdown.upi, settings.currency_symbol)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Cash Collected</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              {formatCurrency(paymentBreakdown.cash, settings.currency_symbol)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Card / POS</span>
            <span className="text-base font-black text-blue-300 font-mono">
              {formatCurrency(paymentBreakdown.card, settings.currency_symbol)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Split Payments</span>
            <span className="text-base font-black text-amber-300 font-mono">
              {formatCurrency(paymentBreakdown.split, settings.currency_symbol)}
            </span>
          </div>
        </div>
      </div>

      {/* STAFF PERFORMANCE LEADERBOARD */}
      <Card className="p-4 bg-zinc-950/80 border-zinc-800">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Stylist & Staff Production Leaderboard ({timeframe.toUpperCase()})
            </h3>
          </div>
          <Badge variant="purple" className="text-[10px]">
            {staffLeaderboard.length} Stylists
          </Badge>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2 px-3">Rank & Stylist</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3 text-center">Services Done</th>
                <th className="py-2 px-3 text-right">Service Production</th>
                <th className="py-2 px-3 text-right">Retail Production</th>
                <th className="py-2 px-3 text-right">Total Production</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {staffLeaderboard.map((st, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-500 w-4">#{idx + 1}</span>
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                        style={{ backgroundColor: st.color }}
                      >
                        {st.name.charAt(0)}
                      </div>
                      <span className="font-bold text-white">{st.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 capitalize">{st.role}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-zinc-300">{st.count}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                    {formatCurrency(st.serviceRev, settings.currency_symbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-pink-300">
                    {formatCurrency(st.productRev, settings.currency_symbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                    {formatCurrency(st.totalRev, settings.currency_symbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* TOP SERVICES & TOP RETAIL PRODUCTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TOP SERVICES */}
        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-indigo-400">
              <Scissors className="h-4 w-4" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Performing Services</h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">By Revenue</span>
          </div>

          <div className="mt-3 space-y-2">
            {topServices.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No service sales recorded for this period.</p>
            ) : (
              topServices.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-400">#{idx + 1}</span>
                    <span className="text-xs font-bold text-white">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-400">{s.count} booked</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {formatCurrency(s.revenue, settings.currency_symbol)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* TOP PRODUCTS */}
        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-pink-400">
              <ShoppingBag className="h-4 w-4" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Selling Retail Products</h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">By Revenue</span>
          </div>

          <div className="mt-3 space-y-2">
            {topProducts.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No retail product sales recorded for this period.</p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-pink-400">#{idx + 1}</span>
                    <span className="text-xs font-bold text-white">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-400">{p.count} sold</span>
                    <span className="font-mono font-bold text-pink-300 text-xs">
                      {formatCurrency(p.revenue, settings.currency_symbol)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* TAX & DISCOUNT TOTALS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Total GST / Tax Collected</span>
            <span className="text-lg font-black text-white font-mono">
              {formatCurrency(kpis.totalTaxes, settings.currency_symbol)}
            </span>
          </div>
          <Percent className="h-6 w-6 text-zinc-600" />
        </div>

        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Total Customer Discounts</span>
            <span className="text-lg font-black text-amber-300 font-mono">
              {formatCurrency(kpis.totalDiscounts, settings.currency_symbol)}
            </span>
          </div>
          <Sparkles className="h-6 w-6 text-amber-500/40" />
        </div>
      </div>
    </div>
  );
}
