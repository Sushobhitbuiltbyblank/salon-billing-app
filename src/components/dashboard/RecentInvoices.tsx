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
  Cloud,
  CloudOff,
  RefreshCw,
  Scissors,
  ShoppingBag,
} from "lucide-react";

export function RecentInvoices() {
  const {
    invoices,
    voidInvoice,
    setPrintInvoice,
    setEditingInvoice,
    setWhatsAppInvoice,
    settings,
    currentUser,
    setActiveTab,
    catalog,
    staff,
    pendingSyncCount,
    syncPendingInvoices,
    isInvoicePendingSync,
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

  // FILTER TODAY'S INVOICES (PLUS ANY PENDING SYNC INVOICES)
  const todaysInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      try {
        const invDate = new Date(inv.created_at);
        const isToday =
          invDate.getFullYear() === now.getFullYear() &&
          invDate.getMonth() === now.getMonth() &&
          invDate.getDate() === now.getDate();

        const isPending = isInvoicePendingSync(inv.id);
        // Ensure all today invoices AND any pending sync invoices remain visible
        if (!isToday && !isPending) return false;

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
  }, [invoices, selectedMode, selectedStatus, searchQuery, isInvoicePendingSync]);

  // TODAY STATS WITH SEPARATE SERVICES & RETAIL PRODUCT SALES
  const todaySettled = todaysInvoices.filter((i) => i.status !== "void");
  const todayTotalCollection = todaySettled.reduce((sum, i) => sum + (i.grand_total || 0), 0);
  const todayVoidCount = todaysInvoices.filter((i) => i.status === "void").length;

  let todayServicesTotal = 0;
  let todayProductsTotal = 0;
  todaySettled.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      if (item.item_type === "product") {
        todayProductsTotal += item.total_price || 0;
      } else {
        todayServicesTotal += item.total_price || 0;
      }
    });
  });

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
            Displaying today&apos;s salon transactions with separate service and retail product sales breakdown.
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

      {/* TODAY SUMMARY STATS: 4-COLUMN CARDS WITH SEPARATE SERVICES & PRODUCTS SALE TOTALS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1: INVOICE COUNT */}
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

        {/* CARD 2: SERVICES SALE AMOUNT */}
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Services Sale</span>
            <div className="h-6 w-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Scissors className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-400 font-mono">
            {formatCurrency(todayServicesTotal, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Salon services & packages</div>
        </Card>

        {/* CARD 3: RETAIL PRODUCTS SALE AMOUNT */}
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Retail Products Sale</span>
            <div className="h-6 w-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-pink-400 font-mono">
            {formatCurrency(todayProductsTotal, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Take-home retail sales</div>
        </Card>

        {/* CARD 4: TODAY GROSS COLLECTION */}
        <Card className="p-3.5 bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-zinc-900/90 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Today&apos;s Collection</span>
            <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(todayTotalCollection, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-semibold">Total settled volume</div>
        </Card>
      </div>

      {/* OFFLINE SYNC ALERT BANNER */}
      {pendingSyncCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/60 shadow-lg shadow-amber-950/20 text-amber-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <CloudOff className="h-4 w-4 animate-pulse" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-amber-200">
                {pendingSyncCount} Invoice{pendingSyncCount > 1 ? "s" : ""} Saved in Offline Queue
              </div>
              <div className="text-[11px] text-amber-300/80">
                All bills are safely preserved in local storage and will sync to the cloud automatically once internet connects.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="glow"
            onClick={() => syncPendingInvoices()}
            className="text-xs shrink-0 h-8 px-3"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync to Cloud Now
          </Button>
        </div>
      )}

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
                <th className="py-3 px-4 text-center w-36">Actions</th>
                <th className="py-3 px-4">Invoice # & Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Mode & Status</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
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

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isVoid ? "opacity-40 line-through bg-red-950/10" : ""
                      }`}
                    >
                      {/* ACTIONS ON THE LEFT: PRINT, EDIT, WHATSAPP, VOID */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* PRINT TRIGGER */}
                          <button
                            type="button"
                            onClick={() => setPrintInvoice(inv)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                            title="Print / View Thermal Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* EDIT INVOICE TRIGGER */}
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                            title="Edit Invoice (Items, Client, Staff, Discount)"
                          >
                            <FileEdit className="h-3.5 w-3.5 text-blue-400 hover:text-white" />
                          </button>

                          {/* WHATSAPP SHARE & DIGITAL BILL MODAL */}
                          <button
                            type="button"
                            onClick={() => setWhatsAppInvoice(inv)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                            title="Send WhatsApp Bill / Share PDF & Image"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-400 hover:text-white" />
                          </button>

                          {/* VOID BUTTON */}
                          {!isVoid && (
                            <button
                              onClick={() => {
                                if (confirm(`Void invoice #${inv.invoice_number}? This cannot be undone.`)) {
                                  voidInvoice(inv.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-600 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-sm"
                              title="Void Invoice"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

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
                        {isInvoicePendingSync(inv.id) ? (
                          <button
                            type="button"
                            onClick={() => syncPendingInvoices()}
                            title="Saved in local offline queue. Click to sync to cloud now."
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer mt-1"
                          >
                            <CloudOff className="h-2.5 w-2.5" />
                            <span>Sync Pending</span>
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] text-emerald-400/80 font-medium mt-1"
                            title="Synced to cloud database"
                          >
                            <Cloud className="h-2.5 w-2.5 text-emerald-400" />
                            <span>Synced</span>
                          </span>
                        )}
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

                      {/* ITEMS SUMMARY WITH DETAILED PACKAGES AND SERVICES */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="space-y-1">
                          {(inv.items || []).map((item, iIdx) => {
                            let services = item.package_services;
                            if (
                              (!services || services.length === 0) &&
                              (item.item_type === "package" ||
                                (item.package_service_ids && item.package_service_ids.length > 0))
                            ) {
                              const catItem = catalog.find(
                                (c) =>
                                  c.id === item.item_id ||
                                  c.name.toLowerCase().trim() === item.item_name.toLowerCase().trim()
                              );
                              if (catItem && catItem.package_service_ids && catItem.package_service_ids.length > 0) {
                                services = catItem.package_service_ids
                                  .map((sId) => catalog.find((c) => c.id === sId))
                                  .filter(Boolean)
                                  .map((s) => ({
                                    service_id: s!.id,
                                    service_name: s!.name,
                                    price: Math.round(item.unit_price / catItem.package_service_ids!.length),
                                    primary_staff_id: item.primary_staff_id,
                                  }));
                              }
                            }

                            const isPkg = item.item_type === "package" || (services && services.length > 0);
                            const primaryStaffName = staff.find((s) => s.id === item.primary_staff_id)?.name;

                            return (
                              <div key={item.id || iIdx} className="text-xs">
                                {isPkg ? (
                                  <div className="bg-purple-950/40 border border-purple-800/50 rounded-lg p-1.5 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                        Package Combo
                                      </span>
                                      <span className="font-bold text-pink-200">
                                        {item.item_name} {item.quantity > 1 ? `(x${item.quantity})` : ""}
                                      </span>
                                    </div>
                                    {services && services.length > 0 && (
                                      <div className="text-[10.5px] text-zinc-300 pl-2 border-l border-purple-700/60 space-y-0.5 mt-1">
                                        {services.map((ps, pIdx) => {
                                          const sName =
                                            staff.find((s) => s.id === ps.primary_staff_id)?.name ||
                                            primaryStaffName;
                                          return (
                                            <div key={pIdx} className="flex items-center justify-between gap-1.5">
                                              <span className="text-zinc-200">
                                                • {ps.service_name}{" "}
                                                {sName && (
                                                  <span className="text-purple-300 font-medium">({sName})</span>
                                                )}
                                              </span>
                                              <span className="text-emerald-400 font-mono font-semibold">
                                                ₹{ps.price}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between text-zinc-200">
                                    <span>
                                      • <span className="font-semibold text-white">{item.item_name}</span>{" "}
                                      {item.quantity > 1 ? `(x${item.quantity})` : ""}
                                      {primaryStaffName && (
                                        <span className="text-purple-400 text-[10.5px] ml-1">
                                          ({primaryStaffName})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
