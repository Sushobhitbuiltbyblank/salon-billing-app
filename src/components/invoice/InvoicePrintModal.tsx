"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThermalReceipt } from "./ThermalReceipt";
import {
  Printer,
  CheckCircle,
  MessageCircle,
  ExternalLink,
  Trash2,
  FileEdit,
} from "lucide-react";
import { generateWhatsAppReceiptUrl } from "@/lib/utils";

export function InvoicePrintModal() {
  const {
    printInvoice,
    setPrintInvoice,
    setEditingInvoice,
    setWhatsAppInvoice,
    settings,
    staff,
    deleteInvoice,
    currentUser,
  } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const [printFormat, setPrintFormat] = useState<"80mm" | "58mm" | "a4">(settings.thermal_width || "80mm");

  if (!printInvoice) return null;

  // Direct Print via hidden isolated iframe: Prints ONLY the receipt preview and guarantees exactly 1 page
  const handleDirectPrint = () => {
    const printableElement = document.getElementById("printable-receipt-area");
    if (!printableElement) {
      window.print();
      return;
    }

    // Remove any previous print iframe
    const existingIframe = document.getElementById("pos-receipt-print-iframe");
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "pos-receipt-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const receiptContent = printableElement.outerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${printInvoice.invoice_number}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              display: flex;
              justify-content: center;
              padding: 0;
              margin: 0;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #printable-receipt-area {
              width: 100% !important;
              max-width: ${printFormat === "a4" ? "680px" : printFormat === "58mm" ? "250px" : "310px"} !important;
              padding: ${printFormat === "a4" ? "12px 14px" : "6px 4px"} !important;
              font-size: ${printFormat === "a4" ? "11.5px" : printFormat === "58mm" ? "8.5px" : "10px"} !important;
              background: #ffffff !important;
              color: #000000 !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              break-inside: avoid !important;
            }
            svg {
              display: inline-block !important;
              max-width: 100% !important;
            }
            svg rect {
              fill: #ffffff !important;
            }
            svg path {
              fill: #000000 !important;
            }
            @media print {
              html, body {
                width: 100%;
                height: 100%;
                max-height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden !important;
                background: #ffffff !important;
              }
              @page {
                margin: 0;
                size: ${printFormat === "a4" ? "A4 portrait" : "auto"};
              }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    doc.close();

    // Allow iframe assets to parse, then trigger print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 180);
  };

  // Dedicated Print Popup Window for manual inspection or PDF download
  const handleOpenPrintWindow = () => {
    const printableElement = document.getElementById("printable-receipt-area");
    if (!printableElement) {
      handleDirectPrint();
      return;
    }

    const printWindow = window.open("", "_blank", "width=600,height=750");
    if (!printWindow) {
      handleDirectPrint();
      return;
    }

    const receiptHtml = printableElement.outerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${printInvoice.invoice_number}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              background: #ffffff;
              color: #000000;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              display: flex;
              justify-content: center;
              padding: 0;
              margin: 0;
              overflow: hidden;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #printable-receipt-area {
              width: 100%;
              max-width: ${printFormat === "a4" ? "680px" : printFormat === "58mm" ? "250px" : "310px"};
              padding: ${printFormat === "a4" ? "14px" : "8px 4px"};
              page-break-inside: avoid;
              break-inside: avoid;
            }
            svg { display: inline-block !important; }
            svg path { fill: #000000 !important; }
            @media print {
              html, body { margin: 0; padding: 0; overflow: hidden; }
              @page { margin: 0; size: ${printFormat === "a4" ? "A4 portrait" : "auto"}; }
            }
          </style>
        </head>
        <body>
          ${receiptHtml}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const whatsappUrl = generateWhatsAppReceiptUrl(printInvoice, settings);

  return (
    <Dialog
      open={Boolean(printInvoice)}
      onOpenChange={(open) => {
        if (!open) setPrintInvoice(null);
      }}
      maxWidth={printFormat === "a4" ? "3xl" : "md"}
    >
      <div className="dialog-header-print-hide no-print">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Invoice Settled & Ready</DialogTitle>
                <DialogDescription>
                  Receipt #{printInvoice.invoice_number} for {printInvoice.customer_name}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>
      </div>

      <div className="space-y-4 pt-3">
        {/* FORMAT SELECTOR PILLS & QUICK ACTIONS (HIDDEN IN PRINT) */}
        <div className="modal-controls no-print flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-400 mr-1 font-medium">Format:</span>
            <button
              type="button"
              onClick={() => setPrintFormat("80mm")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                printFormat === "80mm"
                  ? "bg-purple-600 text-white shadow-sm font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Thermal 80mm
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat("58mm")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                printFormat === "58mm"
                  ? "bg-purple-600 text-white shadow-sm font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Thermal 58mm
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat("a4")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                printFormat === "a4"
                  ? "bg-purple-600 text-white shadow-sm font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              A4 Invoice
            </button>
          </div>

          {/* WHATSAPP ACTION & DIGITAL RECEIPT SHARING */}
          <button
            type="button"
            onClick={() => setWhatsAppInvoice(printInvoice)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            <span>Send on WhatsApp (PDF / Image)</span>
          </button>
        </div>

        {/* PRINTABLE RECEIPT PREVIEW CONTAINER */}
        <div className="max-h-[62vh] overflow-y-auto p-3 sm:p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex justify-center">
          <ThermalReceipt
            invoice={printInvoice}
            settings={settings}
            staffList={staff}
            format={printFormat}
          />
        </div>
      </div>

      <div className="dialog-footer-print-hide no-print">
        <DialogFooter className="gap-2 sm:gap-0 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setPrintInvoice(null)}>
              Done / Close
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const inv = printInvoice;
                setPrintInvoice(null);
                setEditingInvoice(inv);
              }}
              className="gap-1.5 text-xs text-blue-300 border-blue-500/40 hover:bg-blue-950/30"
              title="Edit items, customer details, stylist assignments, or discounts on this invoice"
            >
              <FileEdit className="h-3.5 w-3.5" />
              Edit Invoice
            </Button>

            <Button
              variant="outline"
              onClick={handleOpenPrintWindow}
              className="gap-1.5 text-xs text-purple-300 border-purple-500/40 hover:bg-purple-950/30"
              title="Open clean printable pop-up for PDF saving or thermal printer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Print in Clean Window
            </Button>

            <Button variant="glow" onClick={handleDirectPrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Direct Print Receipt
            </Button>
          </div>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
