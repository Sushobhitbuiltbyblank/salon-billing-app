"use client";

import React, { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  MessageCircle,
  Share2,
  Download,
  Copy,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Scissors,
  User,
  Phone,
  Calendar,
  CreditCard,
  QrCode,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate, generateWhatsAppReceiptUrl } from "@/lib/utils";

export function WhatsAppShareModal() {
  const { whatsAppInvoice, setWhatsAppInvoice, settings, staff } = useApp();
  const receiptCardRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!whatsAppInvoice) return null;

  const cleanPhone = (whatsAppInvoice.customer_phone || "").replace(/[^\d]/g, "");
  const formattedPhone = cleanPhone.length >= 10
    ? `+91 ${cleanPhone.slice(-10, -5)} ${cleanPhone.slice(-5)}`
    : whatsAppInvoice.customer_phone || "Not Provided";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // 1. CAPTURE RECEIPT ELEMENT TO CANVAS
  const generateReceiptCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptCardRef.current) return null;
    try {
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      } as any);
      return canvas;
    } catch (err) {
      console.error("Canvas capture error:", err);
      return null;
    }
  };

  // 2. GENERATE PNG IMAGE BLOB
  const generateImageBlob = async (): Promise<Blob | null> => {
    const canvas = await generateReceiptCanvas();
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  };

  // 3. GENERATE PDF BLOB
  const generatePdfBlob = async (): Promise<{ blob: Blob; filename: string } | null> => {
    const canvas = await generateReceiptCanvas();
    if (!canvas) return null;

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 80; // 80mm thermal width
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [imgWidth, Math.max(imgHeight + 10, 100)],
    });

    pdf.addImage(imgData, "PNG", 0, 5, imgWidth, imgHeight);
    const blob = pdf.output("blob");
    const filename = `Belezia_Bill_${whatsAppInvoice.invoice_number}.pdf`;
    return { blob, filename };
  };

  // 4. ACTION: SEND ON WHATSAPP + AUTO-COPY RECEIPT IMAGE
  const handleSendWhatsApp = async () => {
    setIsGenerating(true);
    try {
      // 1. Try to copy the bill image to clipboard for instant pasting (Ctrl+V / Cmd+V)
      const imageBlob = await generateImageBlob();
      if (imageBlob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": imageBlob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 3000);
          showToast("📋 Bill image copied to clipboard! Press Ctrl+V (or Cmd+V) in WhatsApp to send the image.");
        } catch (clipErr) {
          console.warn("Clipboard image copy not permitted:", clipErr);
        }
      }

      // 2. Open WhatsApp Web / App with itemized formatted text
      const waUrl = generateWhatsAppReceiptUrl(whatsAppInvoice, settings);
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("WhatsApp share error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 5. ACTION: NATIVE SHARE (ATTACH PDF/IMAGE DIRECTLY ON MOBILE/IPAD)
  const handleNativeShare = async (type: "pdf" | "image" = "pdf") => {
    setIsGenerating(true);
    try {
      const waText = `🧾 Invoice ${whatsAppInvoice.invoice_number} from ${settings.salon_name}\nGrand Total: ${settings.currency_symbol}${whatsAppInvoice.grand_total.toFixed(2)}`;

      if (type === "pdf") {
        const pdfData = await generatePdfBlob();
        if (!pdfData) return;
        const file = new File([pdfData.blob], pdfData.filename, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Belezia Invoice #${whatsAppInvoice.invoice_number}`,
            text: waText,
          });
          showToast("✅ Shared PDF receipt successfully!");
          return;
        }
      } else {
        const imageBlob = await generateImageBlob();
        if (!imageBlob) return;
        const filename = `Belezia_Bill_${whatsAppInvoice.invoice_number}.png`;
        const file = new File([imageBlob], filename, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Belezia Invoice #${whatsAppInvoice.invoice_number}`,
            text: waText,
          });
          showToast("✅ Shared Image receipt successfully!");
          return;
        }
      }

      // Fallback: If Web Share API files not supported (e.g. desktop non-Safari), download instead
      if (type === "pdf") {
        await handleDownloadPdf();
      } else {
        await handleDownloadImage();
      }
      showToast("📥 Bill downloaded. You can drag and drop it into WhatsApp!");
    } catch (err) {
      console.error("Native share error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 6. ACTION: DOWNLOAD PDF
  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const pdfData = await generatePdfBlob();
      if (!pdfData) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(pdfData.blob);
      link.download = pdfData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("📄 PDF Invoice downloaded successfully!");
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. ACTION: DOWNLOAD PNG IMAGE
  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const imageBlob = await generateImageBlob();
      if (!imageBlob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(imageBlob);
      link.download = `Belezia_Bill_${whatsAppInvoice.invoice_number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("🖼️ Bill image downloaded successfully!");
    } catch (err) {
      console.error("Image download error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 8. ACTION: COPY IMAGE TO CLIPBOARD
  const handleCopyImageToClipboard = async () => {
    setIsGenerating(true);
    try {
      const imageBlob = await generateImageBlob();
      if (imageBlob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": imageBlob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 3000);
        showToast("📋 Bill image copied to clipboard! Paste (Ctrl+V) into WhatsApp Web.");
      } else {
        alert("Clipboard image copy is not supported in this browser. Please use 'Download Image' or 'Native Share'.");
      }
    } catch (err) {
      console.error("Clipboard copy error:", err);
      alert("Please allow clipboard permissions to copy the bill image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={!!whatsAppInvoice} onOpenChange={(open) => !open && setWhatsAppInvoice(null)} maxWidth="lg">
      <DialogHeader>
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 shadow-lg shadow-emerald-950/40">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
                <span>Send WhatsApp Bill & Digital Receipt</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-mono">
                  #{whatsAppInvoice.invoice_number}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Send itemized bill, attach PDF / image receipt, or copy to clipboard for WhatsApp Web.
              </DialogDescription>
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* TOAST FEEDBACK NOTIFICATION */}
      {toastMessage && (
        <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-6 pt-4 max-h-[75vh] overflow-y-auto">
        {/* LEFT COLUMN: CLIENT & QUICK SHARE ACTIONS */}
        <div className="md:col-span-7 space-y-4">
          {/* CLIENT SUMMARY CARD */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Recipient Client:</span>
              <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-800/60">
                {whatsAppInvoice.status.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-xs">
                  {whatsAppInvoice.customer_name?.charAt(0) || "G"}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{whatsAppInvoice.customer_name}</div>
                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-400" />
                    <span>{formattedPhone}</span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-xs text-zinc-400">Grand Total</div>
                <div className="text-base font-extrabold text-emerald-400">
                  {formatCurrency(whatsAppInvoice.grand_total, settings.currency_symbol)}
                </div>
              </div>
            </div>
          </div>

          {/* PRIMARY ACTION 1: 1-CLICK SEND ON WHATSAPP + COPY BILL IMAGE */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-zinc-950 border border-emerald-500/40 shadow-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-md shadow-emerald-500/30">
                <MessageCircle className="h-4 w-4 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Send on WhatsApp (Direct Chat + Auto-Copy Image)</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">Recommended</span>
                </h4>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                  Opens WhatsApp chat with client details pre-filled and automatically copies the crisp bill image to your clipboard. Just press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-white font-mono text-[10px]">Ctrl+V</kbd> (or <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-white font-mono text-[10px]">Cmd+V</kbd>) to send the image receipt directly!
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isGenerating}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 gap-2 cursor-pointer transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Preparing Bill Image...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 fill-current" />
                  <span>Open WhatsApp & Copy Bill Image</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-70 ml-auto" />
                </>
              )}
            </Button>
          </div>

          {/* ADDITIONAL DIGITAL BILL ACTIONS */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Digital Bill Export & Direct Sharing:
            </label>

            <div className="grid grid-cols-2 gap-2">
              {/* ATTACH & SHARE PDF (NATIVE SHARE) */}
              <button
                type="button"
                onClick={() => handleNativeShare("pdf")}
                disabled={isGenerating}
                className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-all cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Share2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                    Attach PDF to WhatsApp
                  </div>
                  <div className="text-[10px] text-zinc-400">Native mobile/iPad share</div>
                </div>
              </button>

              {/* COPY BILL IMAGE TO CLIPBOARD */}
              <button
                type="button"
                onClick={handleCopyImageToClipboard}
                disabled={isGenerating}
                className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-all cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {copiedImage ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                    {copiedImage ? "Image Copied!" : "Copy Image Receipt"}
                  </div>
                  <div className="text-[10px] text-zinc-400">1-click paste to web chat</div>
                </div>
              </button>

              {/* DOWNLOAD PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-all cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    Download PDF Bill
                  </div>
                  <div className="text-[10px] text-zinc-400">Printable A4 / 80mm PDF</div>
                </div>
              </button>

              {/* DOWNLOAD PNG IMAGE */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-all cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ImageIcon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Download PNG Image
                  </div>
                  <div className="text-[10px] text-zinc-400">High-definition graphic</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HD DIGITAL RECEIPT PREVIEW (RENDER TARGET) */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>Digital Bill Preview (HD Render):</span>
          </div>

          {/* CAPTURE WRAPPER */}
          <div className="w-full max-w-[340px] rounded-2xl overflow-hidden shadow-2xl border border-zinc-700/80 bg-white">
            <div
              ref={receiptCardRef}
              className="bg-white text-zinc-950 p-4 text-[10.5px] leading-tight font-sans selection:bg-purple-100 select-text"
              style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
            >
              {/* SALON BRAND HEADER */}
              <div className="text-center pb-3 border-b border-dashed border-zinc-300">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                    <Scissors className="h-3.5 w-3.5 -rotate-45" />
                  </div>
                  <h3 className="font-extrabold text-sm tracking-tight text-zinc-950">
                    {settings.salon_name}
                  </h3>
                </div>
                <p className="text-[9.5px] text-zinc-500 italic mb-1">{settings.tagline}</p>
                <p className="text-[9px] text-zinc-600 max-w-[240px] mx-auto leading-relaxed">{settings.address}</p>
                <p className="text-[9px] text-zinc-600 font-mono mt-0.5">📞 {settings.phone}</p>
                {settings.gst_number && (
                  <p className="text-[8.5px] text-zinc-500 font-mono">GSTIN: {settings.gst_number}</p>
                )}
              </div>

              {/* INVOICE & CLIENT INFO */}
              <div className="py-2.5 border-b border-dashed border-zinc-300 space-y-1 text-[9.5px]">
                <div className="flex justify-between font-mono font-bold">
                  <span>INVOICE #{whatsAppInvoice.invoice_number}</span>
                  <span>{new Date(whatsAppInvoice.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Date: {formatDate(whatsAppInvoice.created_at)}</span>
                  <span className="capitalize font-semibold text-purple-900 bg-purple-50 px-1 rounded">
                    {whatsAppInvoice.payment_mode}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-800 pt-0.5">
                  <span>Client: <strong>{whatsAppInvoice.customer_name}</strong></span>
                  {whatsAppInvoice.customer_phone && (
                    <span className="font-mono">{whatsAppInvoice.customer_phone}</span>
                  )}
                </div>
              </div>

              {/* ITEMIZED TABLE */}
              <div className="py-2.5 border-b border-dashed border-zinc-300">
                <table className="w-full text-left text-[9.5px]">
                  <thead>
                    <tr className="text-zinc-500 font-bold border-b border-zinc-200 pb-1 text-[8.5px] uppercase tracking-wider">
                      <th className="pb-1">Item / Staff</th>
                      <th className="pb-1 text-center">Qty</th>
                      <th className="pb-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {(whatsAppInvoice.items || []).map((item, idx) => {
                      const primaryStaff = staff.find((s) => s.id === item.primary_staff_id)?.name;
                      const secondaryStaff = item.secondary_staff_id ? staff.find((s) => s.id === item.secondary_staff_id)?.name : null;
                      const staffDisplay = primaryStaff ? (secondaryStaff ? `${primaryStaff} & ${secondaryStaff}` : primaryStaff) : null;

                      return (
                        <tr key={idx} className="py-1">
                          <td className="py-1 pr-1">
                            <div className="font-semibold text-zinc-900">{item.item_name}</div>
                            {staffDisplay && (
                              <div className="text-[8.5px] text-purple-700 font-medium">Stylist: {staffDisplay}</div>
                            )}
                          </td>
                          <td className="py-1 text-center font-mono text-zinc-600">{item.quantity}</td>
                          <td className="py-1 text-right font-mono font-bold text-zinc-900">
                            {formatCurrency(item.total_price, settings.currency_symbol)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TOTALS & BREAKDOWN */}
              <div className="py-2.5 border-b border-dashed border-zinc-300 space-y-1 text-[9.5px]">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(whatsAppInvoice.subtotal, settings.currency_symbol)}</span>
                </div>

                {whatsAppInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(whatsAppInvoice.discount_amount, settings.currency_symbol)}</span>
                  </div>
                )}

                {whatsAppInvoice.tax_amount > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>GST ({whatsAppInvoice.tax_rate}%):</span>
                    <span className="font-mono">+{formatCurrency(whatsAppInvoice.tax_amount, settings.currency_symbol)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-extrabold text-zinc-950 pt-1.5 border-t border-zinc-200">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-purple-900">
                    {formatCurrency(whatsAppInvoice.grand_total, settings.currency_symbol)}
                  </span>
                </div>
              </div>

              {/* FOOTER QR & REVIEW */}
              <div className="pt-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <div className="p-1 bg-white border border-zinc-200 rounded-lg shadow-sm">
                    <QRCodeSVG value={settings.google_review_url || "https://belezia.com"} size={42} />
                  </div>
                  <div className="text-left text-[8.5px] leading-tight text-zinc-600">
                    <p className="font-bold text-zinc-800">🌟 Rate Your Experience</p>
                    <p className="text-zinc-500">Scan QR to review on Google</p>
                    <p className="text-purple-700 font-semibold mt-0.5">📸 @beleziasalonlaxminagar</p>
                  </div>
                </div>

                <p className="text-[9px] text-zinc-500 italic pt-1">
                  Thank you for your visit! Have a wonderful day ahead! ✨
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 border-t border-zinc-800 pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setWhatsAppInvoice(null)}
          className="text-xs"
        >
          Close
        </Button>
        <Button
          type="button"
          onClick={handleSendWhatsApp}
          disabled={isGenerating}
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
        >
          <MessageCircle className="h-3.5 w-3.5 fill-current" />
          <span>Send on WhatsApp</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
