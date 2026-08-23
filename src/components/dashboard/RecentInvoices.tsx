"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Invoice } from "@/types";
import { formatCurrency, formatDate, generateWhatsAppReceiptUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  History,
  Search,
  Printer,
  MessageCircle,
  Ban,
  User,
  Phone,
  Receipt,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  FileEdit,
  ShieldCheck,
} from "lucide-react";

export function RecentInvoices() {
  const {
    invoices,
    voidInvoice,
    setPrintInvoice,
    setEditingInvoice,
    settings,
    currentUser,
    setActiveTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const todayDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // FILTER TODAY'S INVOICES ONLY
  const todaysInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      try {
        const invDate = new Date(inv.created_at);
        const isToday =
          invDate.getFullYear() === now.getFullYear() &&
          invDate.getMonth() === now.getMonth() &&
          invDate.getDate() === now.getDate();

        if (!isToday) return false;

        // Mode filter
        if (selectedMode !== "all" && inv.payment_mode !== selectedMode) {
          return false;
        }
        // Status filter
        if (selectedStatus !== "all" && inv.status !== selectedStatus) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesInv = inv.invoice_number?.toLowerCase().includes(q);
          const matchesName = inv.customer_name?.toLowerCase().includes(q);
          const matchesPhone = (inv.customer_phone || "").includes(q);
          return matchesInv || matchesName || matchesPhone;
        }
        return true;
      } catch {
        return false;
      }
    });
  }, [invoices, selectedMode, selectedStatus, searchQuery]);

  // TODAY STATS
  const todaySettled = todaysInvoices.filter((i) => i.status !== "void");
  const todayTotalCollection = todaySettled.reduce((sum, i) => sum + (i.grand_total || 0), 0);
  const todayVoidCount = todaysInvoices.filter((i) => i.status === "void").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-purple-400" />
              <span>Today&apos;s Live Invoices & Billing Log</span>
            </h2>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[11px] font-bold">
              📅 {todayDateFormatted}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Displaying today&apos;s salon transactions for rapid cashier settlement, thermal receipt reprinting, and client WhatsApp sharing.
          </p>
        </div>

        {currentUser?.role === "admin" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("admin")}
            className="gap-1.5 text-xs text-purple-300 hover:text-white border-purple-800/80 hover:bg-purple-950/60 h-9 px-3 cursor-pointer shrink-0"
          >
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Admin Invoices (Date Filter & Full History)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* TODAY SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Today&apos;s Invoices</span>
            <Receipt className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">{todaysInvoices.length}</div>
          <div className="text-[10px] text-zinc-500 mt-1">
            {todaySettled.length} active paid / {todayVoidCount} voided
          </div>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Today&apos;s Gross Collection</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(todayTotalCollection, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-semibold">Today&apos;s total settled volume</div>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Historical Logs</span>
            <Calendar className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 text-sm font-semibold text-zinc-300">
            {invoices.length} total across all time
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Auditing across custom dates is located in Admin Portal
          </div>
        </Card>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        {/* SEARCH INPUT */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search today's invoices by #, Client Name, or Mobile Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* PAYMENT MODE & STATUS FILTER */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Payment Modes</option>
            <option value="upi">UPI / QR Code</option>
            <option value="cash">Cash</option>
            <option value="card">Card POS</option>
            <option value="split">Split Payment</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="void">Void / Cancelled</option>
          </select>
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-[11px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3 px-4">Invoice # & Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Mode & Status</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {todaysInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                    <p className="text-sm font-semibold text-zinc-400">No invoices found for today</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      New bills generated at the POS will show up here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                todaysInvoices.map((inv) => {
                  const isVoid = inv.status === "void";
                  const whatsappUrl = generateWhatsAppReceiptUrl(inv, settings);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isVoid ? "opacity-40 line-through bg-red-950/10" : ""
                      }`}
                    >
                      {/* INVOICE NUMBER & TIMESTAMP */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs">
                          {inv.invoice_number}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {new Date(inv.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <User className="h-3 w-3 text-purple-400" />
                          {inv.customer_name}
                        </div>
                        {inv.customer_phone && (
                          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            {inv.customer_phone}
                          </div>
                        )}
                      </td>

                      {/* ITEMS SUMMARY */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-zinc-300 font-medium truncate">
                          {(inv.items || []).map((i) => `${i.item_name} (${i.quantity}x)`).join(", ")}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {inv.items?.length || 0} line items
                        </div>
                      </td>

                      {/* MODE & STATUS */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              inv.payment_mode === "upi"
                                ? "purple"
                                : inv.payment_mode === "cash"
                                ? "success"
                                : inv.payment_mode === "card"
                                ? "outline"
                                : "warning"
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {inv.payment_mode}
                          </Badge>
                          <Badge
                            variant={isVoid ? "destructive" : "success"}
                            className="text-[10px] uppercase"
                          >
                            {inv.status}
                          </Badge>
                        </div>
                      </td>

                      {/* GRAND TOTAL */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-400 text-sm">
                        {formatCurrency(inv.grand_total, settings.currency_symbol)}
                      </td>

                      {/* ACTIONS: PRINT, EDIT, WHATSAPP, VOID */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* PRINT TRIGGER */}
                          <button
                            type="button"
                            onClick={() => setPrintInvoice(inv)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white transition-all cursor-pointer"
                            title="Print / View Thermal Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* EDIT INVOICE TRIGGER */}
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white transition-all cursor-pointer"
                            title="Edit Invoice (Items, Client, Staff, Discount)"
                          >
                            <FileEdit className="h-3.5 w-3.5 text-blue-400 hover:text-white" />
                          </button>

                          {/* WHATSAPP SHARE */}
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white transition-all cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>

                          {/* VOID BUTTON */}
                          {!isVoid && (
                            <button
                              onClick={() => {
                                if (confirm(`Void invoice #${inv.invoice_number}? This cannot be undone.`)) {
                                  voidInvoice(inv.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-600 text-zinc-400 hover:text-white transition-all cursor-pointer"
                              title="Void Invoice"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
