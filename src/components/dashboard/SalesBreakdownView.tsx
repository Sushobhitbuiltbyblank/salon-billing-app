"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  getWeekDayWiseSales,
  getMonthDayWiseSales,
  getYearMonthWiseSales,
  PeriodicSalesSummary,
  SalesDataPoint,
} from "@/lib/salesAnalytics";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  Receipt,
  Award,
  Download,
  BarChart3,
  Table as TableIcon,
  CreditCard,
  QrCode,
  Banknote,
  Layers,
  ArrowUpRight,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";

export type SalesPeriodTab = "week" | "month" | "year";

interface SalesBreakdownViewProps {
  initialTab?: SalesPeriodTab;
}

export function SalesBreakdownView({ initialTab = "week" }: SalesBreakdownViewProps) {
  const { invoices, settings } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<SalesPeriodTab>(initialTab);
  const [viewMode, setViewMode] = useState<"both" | "chart" | "table">("both");
  const [onlyActiveDays, setOnlyActiveDays] = useState<boolean>(false);
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);

  // Compute the periodic summary data
  const summary: PeriodicSalesSummary = useMemo(() => {
    if (selectedPeriod === "week") {
      return getWeekDayWiseSales(invoices);
    }
    if (selectedPeriod === "month") {
      return getMonthDayWiseSales(invoices);
    }
    return getYearMonthWiseSales(invoices);
  }, [invoices, selectedPeriod]);

  // Determine peak sales value for scaling bars (minimum 1 to avoid division by 0)
  const maxSales = useMemo(() => {
    const highest = Math.max(...summary.dataPoints.map((p) => p.totalSales), 0);
    return highest > 0 ? highest : 1000;
  }, [summary]);

  // Selected or hovered data point for inspection card
  const activeInspectionPoint: SalesDataPoint | null = useMemo(() => {
    if (hoveredPointKey) {
      return summary.dataPoints.find((p) => p.key === hoveredPointKey) || null;
    }
    if (selectedPointKey) {
      return summary.dataPoints.find((p) => p.key === selectedPointKey) || null;
    }
    // Default to today or peak or first active
    const today = summary.dataPoints.find((p) => p.isCurrent);
    if (today) return today;
    return summary.peakPoint || summary.dataPoints[0] || null;
  }, [summary, hoveredPointKey, selectedPointKey]);

  // Filter table data points if user toggles "only active days"
  const tableDataPoints = useMemo(() => {
    if (onlyActiveDays && selectedPeriod === "month") {
      return summary.dataPoints.filter((p) => p.totalSales > 0);
    }
    return summary.dataPoints;
  }, [summary.dataPoints, onlyActiveDays, selectedPeriod]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "DATE / PERIOD",
      "FULL DATE",
      "TOTAL SALES (INR)",
      "INVOICES COUNT",
      "UPI (INR)",
      "CASH (INR)",
      "CARD (INR)",
      "SPLIT (INR)",
      "SUBTOTAL (INR)",
      "DISCOUNT (INR)",
      "TAX (INR)",
    ];

    const rows = summary.dataPoints.map((p) => [
      `"${p.label}"`,
      `"${p.fullDateStr}"`,
      p.totalSales,
      p.invoiceCount,
      p.paymentBreakdown.upi,
      p.paymentBreakdown.cash,
      p.paymentBreakdown.card,
      p.paymentBreakdown.split,
      p.subtotal,
      p.discount,
      p.tax,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        [`"PERIOD: ${summary.periodTitle.toUpperCase()} - ${summary.dateRangeLabel}"`],
        [`"TOTAL SALES: ${summary.totalSales}"`],
        [`"TOTAL INVOICES: ${summary.totalInvoices}"`],
        [],
        headers,
        ...rows,
      ]
        .map((r) => r.join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Sales_Breakdown_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-b from-zinc-950 via-zinc-900/90 to-zinc-950 border-purple-500/20 shadow-2xl relative overflow-hidden">
      {/* BACKGROUND DECORATIVE ACCENTS */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER WITH VIEW SELECTOR TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-500 p-0.5 shadow-lg shadow-purple-600/30 shrink-0">
            <div className="h-full w-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Total Sales & Periodic Breakdown
              </h3>
              <Badge variant="purple" className="text-[10px] uppercase font-mono tracking-wider font-bold">
                {selectedPeriod === "week"
                  ? "This Week (Day-wise)"
                  : selectedPeriod === "month"
                  ? "This Month (Day-wise)"
                  : "This Year (Month-wise)"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {summary.dateRangeLabel} • Comprehensive daily & monthly sales ledger
            </p>
          </div>
        </div>

        {/* PERIOD TABS (WEEK, MONTH, YEAR) & ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 3 PERIOD SELECTORS */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod("week");
                setSelectedPointKey(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === "week"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>This Week</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedPeriod("month");
                setSelectedPointKey(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === "month"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>This Month</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedPeriod("year");
                setSelectedPointKey(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === "year"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>This Year</span>
            </button>
          </div>

          {/* VIEW MODE TOGGLE (BOTH / CHART / TABLE) */}
          <div className="hidden sm:flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode("both")}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === "both"
                  ? "bg-zinc-800 text-purple-300 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Show Chart & Table"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`p-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === "chart"
                  ? "bg-zinc-800 text-purple-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Chart View"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-zinc-800 text-purple-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* EXPORT CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 px-2.5 text-xs text-purple-300 hover:text-white border-purple-800/60 hover:bg-purple-950/50 cursor-pointer gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* KPI METRIC HIGHLIGHTS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
        {/* TOTAL SALES */}
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 relative overflow-hidden">
          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
            {selectedPeriod === "week"
              ? "Total Week Sales"
              : selectedPeriod === "month"
              ? "Total Month Sales"
              : "Total Year Sales"}
          </span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {formatCurrency(summary.totalSales, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className="text-purple-400 font-bold">{summary.totalInvoices}</span> bills settled
          </div>
        </div>

        {/* AVERAGE SALE */}
        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40">
          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
            {selectedPeriod === "year" ? "Average / Month" : "Average / Day"}
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-300 font-mono mt-1">
            {formatCurrency(summary.averageSales, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            {selectedPeriod === "year"
              ? `${summary.activeDaysCount} active revenue months`
              : `${summary.activeDaysCount} active billing days`}
          </div>
        </div>

        {/* PEAK REVENUE DAY / MONTH */}
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block flex items-center gap-1">
            <Award className="h-3 w-3 text-amber-400" />
            <span>Peak {selectedPeriod === "year" ? "Month" : "Day"}</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1 truncate">
            {summary.peakPoint
              ? formatCurrency(summary.peakPoint.totalSales, settings.currency_symbol)
              : "₹0.00"}
          </div>
          <div className="text-[10px] text-emerald-300/80 mt-1 font-semibold truncate">
            {summary.peakPoint ? summary.peakPoint.label : "No sales yet"}
          </div>
        </div>

        {/* SELECTED / TODAY SNAPSHOT */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            {activeInspectionPoint?.isCurrent
              ? selectedPeriod === "year"
                ? "Current Month Run Rate"
                : "Today's Collection"
              : "Inspected Period"}
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1 truncate">
            {activeInspectionPoint
              ? formatCurrency(activeInspectionPoint.totalSales, settings.currency_symbol)
              : "₹0.00"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1 truncate">
            {activeInspectionPoint ? activeInspectionPoint.label : "Hover over a bar"}
          </div>
        </div>
      </div>

      {/* VISUAL BAR CHART */}
      {(viewMode === "both" || viewMode === "chart") && (
        <div className="mt-2 mb-6 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {selectedPeriod === "week"
                  ? "Day-wise Revenue Histogram (This Week)"
                  : selectedPeriod === "month"
                  ? "Day-wise Revenue Histogram (This Month)"
                  : "Month-wise Revenue Histogram (This Year)"}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 hidden sm:inline">
              Hover or click bars to inspect ticket & payment splits
            </span>
          </div>

          {/* CHART BARS CONTAINER */}
          <div className="relative pt-6 pb-2">
            {/* GRID LINES */}
            <div className="absolute inset-x-0 top-6 bottom-7 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-dashed border-zinc-500 w-full" />
              <div className="border-b border-dashed border-zinc-500 w-full" />
              <div className="border-b border-dashed border-zinc-500 w-full" />
              <div className="border-b border-zinc-700 w-full" />
            </div>

            {/* BARS */}
            <div
              className={`flex items-end gap-1.5 sm:gap-2 h-44 sm:h-52 relative z-10 ${
                selectedPeriod === "month" ? "overflow-x-auto no-scrollbar px-1 pb-1" : "justify-between"
              }`}
            >
              {summary.dataPoints.map((point) => {
                const heightPercent = maxSales > 0 ? Math.max((point.totalSales / maxSales) * 100, 3) : 3;
                const isPeak = summary.peakPoint?.key === point.key && point.totalSales > 0;
                const isSelected = activeInspectionPoint?.key === point.key;
                const isZero = point.totalSales === 0;

                return (
                  <div
                    key={point.key}
                    onClick={() => setSelectedPointKey(point.key)}
                    onMouseEnter={() => setHoveredPointKey(point.key)}
                    onMouseLeave={() => setHoveredPointKey(null)}
                    className={`flex flex-col items-center flex-1 min-w-[32px] sm:min-w-[40px] max-w-[90px] h-full justify-end group cursor-pointer transition-all ${
                      isSelected ? "scale-[1.02]" : ""
                    }`}
                  >
                    {/* BAR TOP AMOUNT (SHOWN ON HOVER OR FOR PEAK/CURRENT) */}
                    <div
                      className={`text-[9px] font-mono font-bold mb-1 transition-opacity ${
                        isSelected || isPeak
                          ? "opacity-100 text-emerald-400 font-extrabold"
                          : "opacity-0 group-hover:opacity-100 text-zinc-400"
                      }`}
                    >
                      {point.totalSales > 0 ? formatCurrency(point.totalSales, settings.currency_symbol) : "—"}
                    </div>

                    {/* BAR PILLAR */}
                    <div className="w-full relative flex items-end justify-center rounded-t-lg overflow-hidden h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 relative ${
                          isZero
                            ? "bg-zinc-800/40 border border-zinc-800/50"
                            : isPeak
                            ? "bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-lg shadow-emerald-500/20"
                            : point.isCurrent
                            ? "bg-gradient-to-t from-amber-600 via-pink-500 to-purple-500 shadow-lg shadow-purple-500/30"
                            : "bg-gradient-to-t from-purple-800/80 via-purple-600 to-indigo-500 group-hover:from-purple-700 group-hover:to-pink-500"
                        } ${isSelected ? "ring-2 ring-white/60" : ""}`}
                      >
                        {/* GLOW HIGHLIGHT ON HOVER */}
                        <div className="absolute inset-0 bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* X-AXIS LABELS */}
                    <div className="mt-2 text-center w-full">
                      <span
                        className={`block text-[10px] sm:text-xs font-bold truncate ${
                          point.isCurrent
                            ? "text-amber-400 font-black underline underline-offset-2"
                            : isPeak
                            ? "text-emerald-400 font-extrabold"
                            : "text-zinc-400 group-hover:text-white"
                        }`}
                      >
                        {point.shortLabel}
                      </span>
                      {selectedPeriod === "week" && (
                        <span className="block text-[8px] text-zinc-500 truncate">
                          {point.label.split(",")[1]?.trim().split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE POINT DETAIL DRAWER / POP-OUT */}
          {activeInspectionPoint && (
            <div className="mt-4 pt-3 border-t border-zinc-800/80 bg-zinc-900/60 p-3 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    activeInspectionPoint.isCurrent
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-purple-500/20 text-purple-300"
                  }`}
                >
                  {activeInspectionPoint.shortLabel}
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{activeInspectionPoint.label}</span>
                    {activeInspectionPoint.isCurrent && (
                      <Badge variant="warning" className="text-[9px] py-0 px-1.5 font-bold">
                        {selectedPeriod === "year" ? "Current Month" : "Today"}
                      </Badge>
                    )}
                    {summary.peakPoint?.key === activeInspectionPoint.key &&
                      activeInspectionPoint.totalSales > 0 && (
                        <Badge variant="success" className="text-[9px] py-0 px-1.5 font-bold">
                          Peak
                        </Badge>
                      )}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {activeInspectionPoint.invoiceCount} invoices settled •{" "}
                    <span className="font-mono font-bold text-purple-300">
                      {formatCurrency(activeInspectionPoint.totalSales, settings.currency_symbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT BREAKDOWN MINI PILLS */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Collections:</span>
                <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-purple-900/40 text-purple-300 font-mono text-[11px]">
                  <QrCode className="h-3 w-3 text-purple-400" />
                  <span>UPI: {formatCurrency(activeInspectionPoint.paymentBreakdown.upi, settings.currency_symbol)}</span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-emerald-900/40 text-emerald-300 font-mono text-[11px]">
                  <Banknote className="h-3 w-3 text-emerald-400" />
                  <span>Cash: {formatCurrency(activeInspectionPoint.paymentBreakdown.cash, settings.currency_symbol)}</span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-blue-900/40 text-blue-300 font-mono text-[11px]">
                  <CreditCard className="h-3 w-3 text-blue-400" />
                  <span>Card: {formatCurrency(activeInspectionPoint.paymentBreakdown.card, settings.currency_symbol)}</span>
                </div>
                {activeInspectionPoint.paymentBreakdown.split > 0 && (
                  <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-amber-900/40 text-amber-300 font-mono text-[11px]">
                    <Layers className="h-3 w-3 text-amber-400" />
                    <span>Split: {formatCurrency(activeInspectionPoint.paymentBreakdown.split, settings.currency_symbol)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DATA BREAKDOWN TABLE */}
      {(viewMode === "both" || viewMode === "table") && (
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {selectedPeriod === "week"
                  ? "Daily Ledger: This Week"
                  : selectedPeriod === "month"
                  ? "Daily Ledger: This Month"
                  : "Monthly Ledger: This Year"}
              </span>
            </div>

            {/* MONTH FILTER: ALL DAYS VS ACTIVE DAYS */}
            {selectedPeriod === "month" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyActiveDays(!onlyActiveDays)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    onlyActiveDays
                      ? "bg-purple-950/60 border-purple-700 text-purple-200 font-bold"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {onlyActiveDays ? "Showing Active Days Only" : "Show All Days of Month"}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/90">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  <th className="py-2.5 px-3.5">
                    {selectedPeriod === "year" ? "Month" : "Date & Day"}
                  </th>
                  <th className="py-2.5 px-3 text-center">Settled Bills</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Payment Channels</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Share of Peak</th>
                  <th className="py-2.5 px-3.5 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {tableDataPoints.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                      No billing activity recorded for this period.
                    </td>
                  </tr>
                ) : (
                  tableDataPoints.map((point) => {
                    const isPeak = summary.peakPoint?.key === point.key && point.totalSales > 0;
                    const peakShare = maxSales > 0 ? Math.round((point.totalSales / maxSales) * 100) : 0;

                    return (
                      <tr
                        key={point.key}
                        onClick={() => setSelectedPointKey(point.key)}
                        className={`hover:bg-zinc-900/70 transition-colors cursor-pointer ${
                          point.isCurrent
                            ? "bg-purple-950/20"
                            : isPeak
                            ? "bg-emerald-950/15"
                            : ""
                        }`}
                      >
                        {/* DATE / PERIOD LABEL */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                point.isCurrent
                                  ? "text-amber-400 font-extrabold"
                                  : isPeak
                                  ? "text-emerald-400"
                                  : "text-white"
                              }`}
                            >
                              {point.label}
                            </span>
                            {point.isCurrent && (
                              <Badge variant="warning" className="text-[9px] py-0 px-1.5 font-bold">
                                {selectedPeriod === "year" ? "Current Month" : "Today"}
                              </Badge>
                            )}
                            {isPeak && (
                              <Badge variant="success" className="text-[9px] py-0 px-1.5 font-bold">
                                Peak
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* INVOICES COUNT */}
                        <td className="py-2.5 px-3 text-center">
                          {point.invoiceCount > 0 ? (
                            <span className="font-mono font-bold text-zinc-200 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                              {point.invoiceCount}
                            </span>
                          ) : (
                            <span className="text-zinc-600 font-mono">0</span>
                          )}
                        </td>

                        {/* PAYMENT BREAKDOWN */}
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          {point.totalSales > 0 ? (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
                              {point.paymentBreakdown.upi > 0 && (
                                <span className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/30">
                                  UPI: {formatCurrency(point.paymentBreakdown.upi, settings.currency_symbol)}
                                </span>
                              )}
                              {point.paymentBreakdown.cash > 0 && (
                                <span className="text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30">
                                  Cash: {formatCurrency(point.paymentBreakdown.cash, settings.currency_symbol)}
                                </span>
                              )}
                              {point.paymentBreakdown.card > 0 && (
                                <span className="text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/30">
                                  Card: {formatCurrency(point.paymentBreakdown.card, settings.currency_symbol)}
                                </span>
                              )}
                              {point.paymentBreakdown.split > 0 && (
                                <span className="text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/30">
                                  Split: {formatCurrency(point.paymentBreakdown.split, settings.currency_symbol)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-[11px]">—</span>
                          )}
                        </td>

                        {/* SHARE OF PEAK PROGRESS BAR */}
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-zinc-900 rounded-full h-1.5 overflow-hidden w-20">
                              <div
                                className={`h-full rounded-full ${
                                  isPeak
                                    ? "bg-emerald-500"
                                    : point.isCurrent
                                    ? "bg-amber-400"
                                    : "bg-purple-500"
                                }`}
                                style={{ width: `${peakShare}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 w-8">
                              {peakShare}%
                            </span>
                          </div>
                        </td>

                        {/* TOTAL REVENUE */}
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-sm">
                          {point.totalSales > 0 ? (
                            <span
                              className={
                                isPeak
                                  ? "text-emerald-400 font-black"
                                  : point.isCurrent
                                  ? "text-amber-300 font-black"
                                  : "text-white"
                              }
                            >
                              {formatCurrency(point.totalSales, settings.currency_symbol)}
                            </span>
                          ) : (
                            <span className="text-zinc-600 font-normal">₹0.00</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* TABLE FOOTER WITH PERIOD TOTALS */}
              <tfoot>
                <tr className="border-t-2 border-zinc-800 bg-zinc-900/90 text-xs font-bold">
                  <td className="py-3 px-3.5 text-white uppercase tracking-wider">
                    Total {selectedPeriod.toUpperCase()} Sales
                  </td>
                  <td className="py-3 px-3 text-center text-purple-300 font-mono">
                    {summary.totalInvoices} bills
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell text-zinc-400 text-[11px]">
                    Avg: {formatCurrency(summary.averageSales, settings.currency_symbol)} /{" "}
                    {selectedPeriod === "year" ? "month" : "day"}
                  </td>
                  <td className="py-3 px-3 hidden sm:table-cell text-zinc-400 text-[11px]">
                    {summary.activeDaysCount} active periods
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-emerald-400 text-base font-black">
                    {formatCurrency(summary.totalSales, settings.currency_symbol)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
