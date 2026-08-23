"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Invoice } from "@/types";
import { formatCurrency, formatDate, generateWhatsAppReceiptUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Receipt,
  Search,
  Printer,
  MessageCircle,
  Ban,
  Trash2,
  AlertTriangle,
  FileEdit,
  Shield,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Download,
} from "lucide-react";

export function AdminInvoiceManagement() {
  const {
    invoices,
    voidInvoice,
    deleteInvoice,
    setPrintInvoice,
    setEditingInvoice,
    settings,
    staff,
    currentUser,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // FILTERED INVOICES
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
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
    });
  }, [invoices, selectedMode, selectedStatus, searchQuery]);

  // KPIS
  const totalSettledCount = invoices.filter((i) => i.status !== "void").length;
  const totalVoidCount = invoices.filter((i) => i.status === "void").length;
  const totalSettledAmount = invoices
    .filter((i) => i.status !== "void")
    .reduce((sum, i) => sum + (i.grand_total || 0), 0);

  // HANDLE PERMANENT DELETE
  const handleConfirmDelete = async () => {
    if (!isAdmin) {
      alert("Permission Denied: Only Salon Administrator can permanently delete invoices.");
      return;
    }
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceToDelete.id);
      setInvoiceToDelete(null);
    } catch (err) {
      console.error("Failed to delete invoice:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // EXPORT INVOICE LIST CSV
  const handleExportCSV = () => {
    const rows = [
      ["INVOICE #", "DATE & TIME", "CUSTOMER", "PHONE", "PAYMENT MODE", "STATUS", "SUBTOTAL", "DISCOUNT", "TAX", "GRAND TOTAL"],
      ...filteredInvoices.map((inv) => [
        inv.invoice_number,
        new Date(inv.created_at).toLocaleString("en-IN"),
        inv.customer_name,
        inv.customer_phone || "N/A",
        inv.payment_mode.toUpperCase(),
        inv.status.toUpperCase(),
        inv.subtotal,
        inv.discount_amount,
        inv.tax_amount,
        inv.grand_total,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Belezia_Invoices_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ADMIN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Invoice Audit & Master Management</span>
              <Badge variant={isAdmin ? "destructive" : "secondary"} className="text-[10px] py-0 px-2 font-mono font-bold">
                {isAdmin ? "👑 Admin Access" : "💼 Receptionist (Read-Only Audit)"}
              </Badge>
            </h3>
            <p className="text-xs text-zinc-400">
              {isAdmin
                ? "Only Salon Admins can permanently delete or void invoices from cloud & local storage."
                : "Audit past invoice transactions and reprint receipts. Invoice deletion requires Administrator credentials."}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="gap-1.5 text-xs text-purple-300 hover:text-white border-purple-800/80 hover:bg-purple-950/60 h-9 px-3 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Invoices CSV</span>
        </Button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Invoices</span>
            <Receipt className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">{invoices.length}</div>
          <div className="text-[10px] text-zinc-500 mt-1">{totalSettledCount} active / {totalVoidCount} voided</div>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Settled Billing Volume</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400 font-mono">
            {formatCurrency(totalSettledAmount, settings.currency_symbol)}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-semibold">Active gross collection</div>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Voided / Cancelled</span>
            <Ban className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-black text-amber-400 font-mono">{totalVoidCount}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Invoices marked as void</div>
        </Card>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Client Name, or Mobile Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Payment Modes</option>
            <option value="upi">UPI / Online</option>
            <option value="cash">Cash in Drawer</option>
            <option value="card">Card / POS</option>
            <option value="split">Split Payment</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="settled">Settled</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      {/* INVOICE TABLE */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-semibold text-[10px] border-b border-zinc-800">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Services / Products</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30 text-zinc-400" />
                    <p className="font-semibold text-sm">No invoices found matching criteria</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isVoid = inv.status === "void";
                  const whatsappUrl = generateWhatsAppReceiptUrl(inv, settings);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-zinc-900/60 transition-colors ${
                        isVoid ? "opacity-45 line-through bg-zinc-950/40" : ""
                      }`}
                    >
                      {/* INVOICE NUMBER */}
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>#{inv.invoice_number}</span>
                          {isVoid && (
                            <Badge variant="destructive" className="text-[9px] py-0 px-1">
                              VOID
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* DATE */}
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                        <div>{formatDate(inv.created_at)}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(inv.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{inv.customer_name}</span>
                        </div>
                        {inv.customer_phone && (
                          <div className="text-[10px] text-zinc-400 font-mono">{inv.customer_phone}</div>
                        )}
                      </td>

                      {/* ITEMS SUMMARY */}
                      <td className="py-3 px-4 text-zinc-300">
                        <div className="max-w-[220px] truncate text-xs">
                          {inv.items.map((i) => `${i.item_name} (x${i.quantity})`).join(", ")}
                        </div>
                        <div className="text-[10px] text-zinc-500">{inv.items.length} item(s)</div>
                      </td>

                      {/* PAYMENT MODE & STATUS */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              inv.payment_mode === "cash"
                                ? "success"
                                : inv.payment_mode === "upi"
                                ? "purple"
                                : "secondary"
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {inv.payment_mode}
                          </Badge>
                        </div>
                      </td>

                      {/* GRAND TOTAL */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-400 text-sm">
                        {formatCurrency(inv.grand_total, settings.currency_symbol)}
                      </td>

                      {/* ADMIN ACTIONS: PRINT, EDIT, VOID, DELETE */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* PRINT */}
                          <button
                            type="button"
                            onClick={() => setPrintInvoice(inv)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white transition-all cursor-pointer"
                            title="Print / View Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* EDIT INVOICE */}
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white transition-all cursor-pointer"
                            title="Edit Invoice"
                          >
                            <FileEdit className="h-3.5 w-3.5 text-blue-400 hover:text-white" />
                          </button>

                          {/* WHATSAPP */}
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white transition-all"
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

                          {/* PERMANENT DELETE (ADMIN ONLY) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setInvoiceToDelete(inv)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-600 border border-rose-800/40 hover:border-rose-600 text-rose-400 hover:text-white transition-all group cursor-pointer"
                              title="Permanently Delete Invoice (Admin Only)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* DEDICATED DELETE CONFIRMATION DIALOG (ADMIN ONLY) */}
      <Dialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)} maxWidth="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-rose-400 text-base font-extrabold flex items-center gap-2">
                Permanently Delete Invoice #{invoiceToDelete?.invoice_number}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Action requires Administrator credentials
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {invoiceToDelete && (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Warning: Permanent Deletion</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">
                  This will permanently delete this invoice record from both local storage and Supabase Cloud. Sales revenue, tax records, and commissions tied to this invoice will be adjusted.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Client:</span>
                <span className="font-bold text-white">{invoiceToDelete.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Amount:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(invoiceToDelete.grand_total, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Date:</span>
                <span className="text-zinc-300">{formatDate(invoiceToDelete.created_at)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setInvoiceToDelete(null)}
            className="text-xs"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 font-bold"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting from Cloud..." : "Confirm Permanent Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
