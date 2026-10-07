"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Customer,
  Invoice,
} from "@/types";
import {
  calculateReminderConversionMatrix,
  ReminderConversionMatrix,
  ReminderConversionRecord,
} from "@/lib/reminderUtils";
import {
  TrendingUp,
  Users,
  Copy,
  Check,
  Download,
  RefreshCw,
  X,
  Search,
  MessageSquare,
  Clock,
  Sparkles,
  Phone,
  FileText,
  DollarSign,
  Receipt,
  UserCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ReminderConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  invoices: Invoice[];
  onStartBill?: (cust: Customer) => void;
  onViewHistory?: (cust: Customer) => void;
}

export function ReminderConversionModal({
  isOpen,
  onClose,
  customers,
  invoices,
  onStartBill,
  onViewHistory,
}: ReminderConversionModalProps) {
  const [matrixData, setMatrixData] = useState<ReminderConversionMatrix | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedType, setCopiedType] = useState<"names_numbers" | "csv" | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "plaintext">("cards");

  // On-demand computation: only calculates when modal opens or user explicitly triggers refresh
  const runAnalysis = () => {
    setIsCalculating(true);
    // Use timeout to allow UI rendering of loader if data is very large
    setTimeout(() => {
      try {
        const result = calculateReminderConversionMatrix(customers, invoices);
        setMatrixData(result);
      } catch (err) {
        console.error("Error calculating reminder conversion matrix:", err);
      } finally {
        setIsCalculating(false);
      }
    }, 50);
  };

  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    } else {
      // Free memory when closed
      setMatrixData(null);
      setSearchQuery("");
      setCopiedType(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Filtered converted records
  const filteredRecords = useMemo(() => {
    if (!matrixData) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matrixData.convertedRecords;

    return matrixData.convertedRecords.filter((rec) => {
      const name = rec.customer.name.toLowerCase();
      const phone = (rec.customer.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [matrixData, searchQuery]);

  // Clean plain text formatted list of user name and number only
  const namesAndNumbersOnlyText = useMemo(() => {
    if (!matrixData || matrixData.convertedRecords.length === 0) return "";
    return matrixData.convertedRecords
      .map((r) => `${r.customer.name} - ${r.customer.phone}`)
      .join("\n");
  }, [matrixData]);

  const handleCopyNamesAndNumbers = async () => {
    if (!namesAndNumbersOnlyText) return;
    try {
      await navigator.clipboard.writeText(namesAndNumbersOnlyText);
      setCopiedType("names_numbers");
      setTimeout(() => setCopiedType(null), 3000);
    } catch (err) {
      console.error("Failed to copy names and numbers:", err);
    }
  };

  const handleCopySinglePhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (err) {
      console.error("Failed to copy phone:", err);
    }
  };

  const handleExportCSV = () => {
    if (!matrixData || matrixData.convertedRecords.length === 0) return;

    const headers = [
      "Client Name",
      "Phone Number",
      "First Reminder Sent",
      "Latest Reminder Sent",
      "First Return Visit",
      "Days to Return",
      "Invoices After Reminder",
      "Total Revenue Generated (INR)",
    ];

    const rows = matrixData.convertedRecords.map((r) => [
      `"${r.customer.name.replace(/"/g, '""')}"`,
      `"${r.customer.phone}"`,
      `"${r.firstReminderSentAt || ""}"`,
      `"${r.lastReminderSentAt || ""}"`,
      `"${r.firstVisitAfterReminder || ""}"`,
      r.daysToReturn ?? "",
      r.invoicesAfterReminder.length,
      r.totalRevenueAfterReminder,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `reminder_conversion_matrix_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedType("csv");
    setTimeout(() => setCopiedType(null), 3000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-600/30 shrink-0">
              <div className="h-full w-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Reminder Conversion & ROI Matrix
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold py-0.5 px-2">
                  On-Demand Intelligence
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Evaluates clients who returned to visit or bill at the salon after promotional follow-up reminders.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TOP CONTROLS & ACTION BAR */}
        <div className="p-3 sm:px-5 bg-zinc-900/30 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={runAnalysis}
              disabled={isCalculating}
              className="h-8 text-xs gap-1.5 border-zinc-700 bg-zinc-800/80 hover:bg-zinc-750 text-zinc-200 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCalculating ? "animate-spin text-emerald-400" : ""}`} />
              <span>{isCalculating ? "Recalculating..." : "Recalculate Matrix"}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleCopyNamesAndNumbers}
              disabled={!matrixData || matrixData.convertedRecords.length === 0}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md shadow-emerald-600/20"
              title="Copy clean list with user name and number only"
            >
              {copiedType === "names_numbers" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Copied Names & Numbers!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Name & Number List ({matrixData?.totalConvertedCustomers || 0})</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={!matrixData || matrixData.convertedRecords.length === 0}
              className="h-8 text-xs gap-1.5 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
              title="Export full conversion table to CSV"
            >
              {copiedType === "csv" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Downloaded CSV</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Interactive View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("plaintext")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "plaintext"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Plain Text (Name & Number Only)
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* KPI MATRIX CARDS */}
          {matrixData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3 bg-zinc-900/60 border-zinc-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Reminders Sent
                  </span>
                  <div className="h-6 w-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-white">
                    {matrixData.totalRemindedCustomers}
                  </span>
                  <span className="text-[10px] text-zinc-500">contacted</span>
                </div>
              </Card>

              <Card className="p-3 bg-emerald-950/30 border-emerald-500/40 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Returned Clients
                  </span>
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-emerald-300">
                    {matrixData.totalConvertedCustomers}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold">
                    came back
                  </span>
                </div>
              </Card>

              <Card className="p-3 bg-zinc-900/60 border-zinc-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Conversion Rate
                  </span>
                  <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-amber-300">
                    {matrixData.conversionRate}%
                  </span>
                  <span className="text-[10px] text-zinc-500">ROI success</span>
                </div>
              </Card>

              <Card className="p-3 bg-zinc-900/60 border-zinc-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Revenue Recovered
                  </span>
                  <div className="h-6 w-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-cyan-300">
                    ₹{matrixData.totalRevenueGenerated.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    (~₹{matrixData.averageRevenuePerConverted}/client)
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* VIEW MODE: PLAIN TEXT (NAME AND NUMBER ONLY) */}
          {viewMode === "plaintext" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <span>Raw List: User Name & Number Only</span>
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Clean line-separated text ready to copy or paste into messages, reports, or sheets.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleCopyNamesAndNumbers}
                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  {copiedType === "names_numbers" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy All Text</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={14}
                  value={namesAndNumbersOnlyText || "No returning clients found."}
                  className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-emerald-500 resize-none selection:bg-emerald-500/30 selection:text-white"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>
            </div>
          ) : (
            /* VIEW MODE: INTERACTIVE CARDS & TABLE */
            <div className="space-y-3">
              {/* SEARCH BAR */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Search by client name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="text-xs text-zinc-400 font-medium">
                  Showing <strong className="text-white">{filteredRecords.length}</strong> of{" "}
                  <strong className="text-emerald-400">{matrixData?.totalConvertedCustomers || 0}</strong> returning clients
                </div>
              </div>

              {/* LIST OF RETURNED CLIENTS */}
              {isCalculating ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-xs text-zinc-400">Analyzing reminder logs and invoice visits on demand...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-10 text-center rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-zinc-400 text-xs space-y-2">
                  <UserCheck className="h-8 w-8 text-zinc-600 mx-auto" />
                  <p className="font-bold text-zinc-300">
                    {searchQuery ? "No converted clients match your search query." : "No converted clients found yet."}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Clients will appear here once they complete a salon visit after receiving a reminder message.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecords.map((rec, index) => {
                    const cust = rec.customer;
                    const latestInvoice = rec.invoicesAfterReminder[rec.invoicesAfterReminder.length - 1];
                    const cleanPhone = cust.phone.replace(/\D/g, "").slice(-10);

                    return (
                      <div
                        key={cust.id || cust.phone || index}
                        className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/90 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        {/* LEFT: NAME & PHONE */}
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                                {cust.name}
                              </span>
                              {cust.gender && cust.gender !== "unspecified" && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] py-0 px-1.5 uppercase font-medium bg-zinc-800 text-zinc-400"
                                >
                                  {cust.gender}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">
                                {cust.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopySinglePhone(cust.phone)}
                                className="text-zinc-500 hover:text-zinc-200 transition-colors p-0.5"
                                title="Copy phone number"
                              >
                                {copiedPhone === cust.phone ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                              <a
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-500 hover:text-emerald-400 transition-colors p-0.5"
                                title="Open WhatsApp Chat"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* MIDDLE: TIMELINE & REVENUE */}
                        <div className="flex items-center gap-4 text-xs sm:border-l sm:border-zinc-800 sm:pl-4">
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase font-medium">
                              Reminder Sent
                            </span>
                            <span className="text-zinc-300 font-medium">
                              {formatShortDate(rec.firstReminderSentAt)}
                            </span>
                          </div>

                          <div className="text-center">
                            <span className="text-[10px] text-emerald-400 block uppercase font-bold">
                              Return Visit
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-white font-bold">
                                {formatShortDate(rec.firstVisitAfterReminder)}
                              </span>
                              {rec.daysToReturn !== undefined && (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] py-0 px-1 font-bold">
                                  +{rec.daysToReturn}d
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase font-medium">
                              Amount Spent
                            </span>
                            <span className="text-emerald-300 font-black font-mono">
                              ₹{rec.totalRevenueAfterReminder.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* RIGHT: QUICK ACTIONS */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          {onViewHistory && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                onViewHistory(cust);
                                onClose();
                              }}
                              className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 cursor-pointer"
                              title="View full customer history & past invoices"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline ml-1">History</span>
                            </Button>
                          )}

                          {onStartBill && (
                            <Button
                              size="sm"
                              onClick={() => {
                                onStartBill(cust);
                                onClose();
                              }}
                              className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-2.5 cursor-pointer shadow-sm shadow-purple-600/30"
                              title="Create bill in POS"
                            >
                              <span>Start Bill</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 sm:px-5 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>On-demand matrix calculation active</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-8 text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
