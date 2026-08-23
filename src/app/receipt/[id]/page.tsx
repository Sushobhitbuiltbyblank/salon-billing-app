"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Storage, DEFAULT_SETTINGS, DEFAULT_STAFF } from "@/lib/storage";
import { Invoice, SalonSettings, Staff } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Scissors,
  Download,
  Printer,
  Image as ImageIcon,
  Share2,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Sparkles,
  Star,
  ExternalLink,
  Loader2,
  AlertCircle,
  Receipt,
} from "lucide-react";

export default function PublicReceiptPage() {
  const params = useParams();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [staff, setStaff] = useState<Staff[]>(DEFAULT_STAFF);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchReceiptData() {
      if (!invoiceId) return;

      try {
        setLoading(true);

        // 1. Check local storage first
        const localInvoices = Storage.getInvoices();
        const localInv = localInvoices.find(
          (inv) => inv.id === invoiceId || inv.invoice_number === invoiceId
        );

        if (localInv) {
          setInvoice(localInv);
          setSettings(Storage.getSettings());
          setStaff(Storage.getStaff());
          setLoading(false);
          return;
        }

        // 2. Fetch from Supabase PostgreSQL if configured
        if (isSupabaseConfigured() && supabase) {
          const { data: invData, error: invErr } = await supabase
            .from("invoices")
            .select("*, invoice_items(*)")
            .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`)
            .single();

          if (invData && !invErr) {
            const formattedInvoice: Invoice = {
              ...invData,
              subtotal: Number(invData.subtotal) || 0,
              tax_amount: Number(invData.tax_amount) || 0,
              discount_amount: Number(invData.discount_amount) || 0,
              grand_total: Number(invData.grand_total) || 0,
              items: (invData.invoice_items || []).map((it: any) => ({
                ...it,
                unit_price: Number(it.unit_price) || 0,
                discount: Number(it.discount) || 0,
                total_price: Number(it.total_price) || 0,
              })),
            };

            setInvoice(formattedInvoice);

            // Fetch settings and staff
            const [settingsRes, staffRes] = await Promise.all([
              supabase.from("salon_settings").select("*").single(),
              supabase.from("staff").select("*"),
            ]);

            if (settingsRes.data) setSettings(settingsRes.data);
            if (staffRes.data) setStaff(staffRes.data);

            setLoading(false);
            return;
          }
        }

        setError("Invoice not found or expired.");
      } catch (err) {
        console.error("Receipt load error:", err);
        setError("Unable to load receipt details.");
      } finally {
        setLoading(false);
      }
    }

    fetchReceiptData();
  }, [invoiceId]);

  // DOWNLOAD PDF
  const handleDownloadPdf = async () => {
    if (!receiptRef.current || !invoice) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      } as any);

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 80; // 80mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [imgWidth, Math.max(imgHeight + 10, 100)],
      });

      pdf.addImage(imgData, "PNG", 0, 5, imgWidth, imgHeight);
      pdf.save(`Belezia_Bill_${invoice.invoice_number}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // SAVE IMAGE (PNG)
  const handleDownloadImage = async () => {
    if (!receiptRef.current || !invoice) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      } as any);

      const link = document.createElement("a");
      link.download = `Belezia_Bill_${invoice.invoice_number}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Image generation error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-white p-4">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-purple-600/30 text-purple-400 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">Retrieving Digital Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-white p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/30">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-white">Invoice Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm mt-1">
          {error || "The requested bill could not be found or has expired."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white py-6 px-3 flex flex-col items-center justify-center">
      {/* TOP HEADER CONTROLS */}
      <div className="w-full max-w-[400px] mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white">
            <Scissors className="h-4 w-4 -rotate-45" />
          </div>
          <span className="text-xs font-bold text-zinc-200">Digital Tax Invoice</span>
        </div>

        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-mono">
          {invoice.status.toUpperCase()}
        </Badge>
      </div>

      {/* RENDERED LUXURY BILL CARD */}
      <div className="w-full max-w-[400px] rounded-3xl overflow-hidden shadow-2xl border border-zinc-700/80 bg-white">
        <div
          ref={receiptRef}
          className="bg-white text-zinc-950 p-6 text-[11px] leading-tight font-sans selection:bg-purple-100"
          style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
          {/* SALON HEADER */}
          <div className="text-center pb-4 border-b border-dashed border-zinc-300">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Scissors className="h-4 w-4 -rotate-45" />
              </div>
              <h1 className="font-extrabold text-base tracking-tight text-zinc-950">
                {settings.salon_name}
              </h1>
            </div>
            <p className="text-[10px] text-zinc-500 italic mb-1">{settings.tagline}</p>
            <p className="text-[9.5px] text-zinc-600 max-w-[280px] mx-auto leading-relaxed">{settings.address}</p>
            <p className="text-[9.5px] text-zinc-600 font-mono mt-0.5">📞 {settings.phone}</p>
            {settings.gst_number && (
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">GSTIN: {settings.gst_number}</p>
            )}
          </div>

          {/* INVOICE & CLIENT INFO */}
          <div className="py-3 border-b border-dashed border-zinc-300 space-y-1.5 text-[10px]">
            <div className="flex justify-between font-mono font-bold">
              <span>INVOICE #{invoice.invoice_number}</span>
              <span>{new Date(invoice.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Date: {formatDate(invoice.created_at)}</span>
              <span className="capitalize font-semibold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded">
                Payment: {invoice.payment_mode}
              </span>
            </div>
            <div className="flex justify-between text-zinc-800 pt-0.5">
              <span>Client: <strong>{invoice.customer_name}</strong></span>
              {invoice.customer_phone && (
                <span className="font-mono">{invoice.customer_phone}</span>
              )}
            </div>
          </div>

          {/* ITEMIZED SERVICES & PRODUCTS */}
          <div className="py-3 border-b border-dashed border-zinc-300">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="text-zinc-500 font-bold border-b border-zinc-200 pb-1 text-[9px] uppercase tracking-wider">
                  <th className="pb-1.5">Item / Stylist</th>
                  <th className="pb-1.5 text-center">Qty</th>
                  <th className="pb-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(invoice.items || []).map((item, idx) => {
                  const primaryStaff = staff.find((s) => s.id === item.primary_staff_id)?.name;
                  const secondaryStaff = item.secondary_staff_id ? staff.find((s) => s.id === item.secondary_staff_id)?.name : null;
                  const staffDisplay = primaryStaff ? (secondaryStaff ? `${primaryStaff} & ${secondaryStaff}` : primaryStaff) : null;

                  return (
                    <tr key={idx}>
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-zinc-900">{item.item_name}</div>
                        {staffDisplay && (
                          <div className="text-[9px] text-purple-700 font-medium">Stylist: {staffDisplay}</div>
                        )}
                      </td>
                      <td className="py-1.5 text-center font-mono text-zinc-600">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-zinc-900">
                        {formatCurrency(item.total_price, settings.currency_symbol)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTALS & BREAKDOWN */}
          <div className="py-3 border-b border-dashed border-zinc-300 space-y-1.5 text-[10px]">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal, settings.currency_symbol)}</span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(invoice.discount_amount, settings.currency_symbol)}</span>
              </div>
            )}

            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>GST ({invoice.tax_rate}%):</span>
                <span className="font-mono">+{formatCurrency(invoice.tax_amount, settings.currency_symbol)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-black text-zinc-950 pt-2 border-t border-zinc-200">
              <span>GRAND TOTAL:</span>
              <span className="font-mono text-purple-900 text-base font-extrabold">
                {formatCurrency(invoice.grand_total, settings.currency_symbol)}
              </span>
            </div>
          </div>

          {/* QR CODE & REVIEW LINKS */}
          <div className="pt-4 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-3">
              <div className="p-1.5 bg-white border border-zinc-200 rounded-xl shadow-sm">
                <QRCodeSVG value={settings.google_review_url || "https://belezia.com"} size={52} />
              </div>
              <div className="text-left text-[9px] leading-tight text-zinc-600">
                <p className="font-bold text-zinc-800 text-[10px]">🌟 Rate Your Experience</p>
                <p className="text-zinc-500 mt-0.5">Scan QR to review on Google</p>
                <p className="text-purple-700 font-semibold mt-1">📸 @beleziasalonlaxminagar</p>
              </div>
            </div>

            <p className="text-[9.5px] text-zinc-500 italic pt-1">
              Thank you for choosing {settings.salon_name}! Have a glamorous day ahead! ✨
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BUTTONS */}
      <div className="w-full max-w-[400px] mt-4 grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isExporting}
          className="h-11 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 gap-1.5 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download PDF</span>
        </Button>

        <Button
          type="button"
          onClick={handleDownloadImage}
          disabled={isExporting}
          variant="outline"
          className="h-11 rounded-2xl border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800 font-bold text-xs gap-1.5 cursor-pointer"
        >
          <ImageIcon className="h-4 w-4 text-pink-400" />
          <span>Save Image</span>
        </Button>
      </div>

      {/* GOOGLE REVIEW LINK */}
      {settings.google_review_url && (
        <a
          href={settings.google_review_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>Rate Us on Google (5-Stars)</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
