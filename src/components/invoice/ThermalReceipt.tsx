"use client";

import React from "react";
import { Invoice, SalonSettings, Staff } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { QrCodeImage } from "@/components/ui/QrCodeImage";

interface ThermalReceiptProps {
  invoice: Invoice;
  settings: SalonSettings;
  staffList: Staff[];
  format?: "80mm" | "58mm" | "a4";
}

export function ThermalReceipt({
  invoice,
  settings,
  staffList,
  format = "80mm",
}: ThermalReceiptProps) {
  const getStaffName = (id?: string) => {
    if (!id) return null;
    const found = staffList.find((s) => s.id === id);
    return found ? found.name : null;
  };

  const isA4 = format === "a4";
  const is58mm = format === "58mm";

  const googleReviewUrl = settings.google_review_url || "https://g.page/r/CbGd_cwnL9zrEBM/review";
  const instagramUrl = settings.instagram_url || "https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr";
  const qrSize = isA4 ? 76 : is58mm ? 48 : 58;

  const instaHandle = (() => {
    try {
      if (settings.instagram_url) {
        const clean = settings.instagram_url.split("?")[0].replace(/\/+$/, "");
        const parts = clean.split("/").filter(Boolean);
        const handle = parts[parts.length - 1];
        if (handle && handle !== "instagram.com" && handle !== "www.instagram.com") {
          return `@${handle}`;
        }
      }
    } catch {
      // fallback
    }
    return "@beleziasalonlaxminagar";
  })();

  return (
    <div
      id="printable-receipt-area"
      className="mx-auto bg-white text-black font-mono select-none"
      style={{
        backgroundColor: "#ffffff",
        color: "#000000",
        width: "100%",
        maxWidth: isA4 ? "680px" : is58mm ? "250px" : "310px",
        padding: isA4 ? "14px 16px" : is58mm ? "4px 2px" : "8px 6px",
        fontSize: isA4 ? "11.5px" : is58mm ? "8.5px" : "10px",
        lineHeight: "1.25",
        pageBreakInside: "avoid",
        pageBreakAfter: "avoid",
        pageBreakBefore: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* SALON HEADER */}
      <div style={{ textAlign: "center", paddingBottom: "4px", borderBottom: "1.5px dashed #000000" }}>
        <h2 style={{ fontSize: isA4 ? "17px" : is58mm ? "12px" : "14px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0" }}>
          {settings.salon_name}
        </h2>
        <p style={{ fontSize: "9px", fontStyle: "italic", color: "#333333", margin: "1px 0" }}>{settings.tagline}</p>
        <p style={{ fontSize: "9px", color: "#222222", margin: "1px 0" }}>{settings.address}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", fontSize: "9px", fontWeight: "600", marginTop: "1px" }}>
          <span>Ph: {settings.phone}</span>
          {settings.gst_number && <span>GST: {settings.gst_number}</span>}
        </div>
      </div>

      {/* INVOICE METADATA */}
      <div style={{ padding: "4px 0", borderBottom: "1px dashed #000000", fontSize: "9.5px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span><strong>INVOICE:</strong> {invoice.invoice_number}</span>
          <span>{formatDate(invoice.created_at)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1px" }}>
          <span>Client: <strong>{invoice.customer_name}</strong></span>
          {invoice.customer_phone && <span>Ph: {invoice.customer_phone}</span>}
        </div>
      </div>

      {/* LINE ITEMS TABLE */}
      <div style={{ padding: "4px 0", borderBottom: "1.5px dashed #000000" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #000000", fontSize: "9px", textTransform: "uppercase", fontWeight: "bold" }}>
              <th style={{ padding: "2px 1px" }}>Item / Stylist</th>
              <th style={{ textAlign: "center", padding: "2px 1px", width: "24px" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "2px 1px", width: "48px" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "2px 1px", width: "54px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const primary = getStaffName(item.primary_staff_id);
              const secondary = getStaffName(item.secondary_staff_id);

              return (
                <tr key={idx} style={{ verticalAlign: "top", borderBottom: "1px dotted #f0f0f0" }}>
                  <td style={{ padding: "2px 1px" }}>
                    <div style={{ fontWeight: "bold" }}>{item.item_name}</div>
                    {item.item_type === "package" && item.package_services && item.package_services.length > 0 ? (
                      <div style={{ fontSize: "8px", color: "#333333", marginTop: "1px", paddingLeft: "2px" }}>
                        {item.package_services.map((ps, pIdx) => {
                          const sName = getStaffName(ps.primary_staff_id);
                          return (
                            <div key={pIdx}>
                              • {ps.service_name} {sName ? `(${sName})` : ""}: ₹{ps.price}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: "8.5px", color: "#555555", fontStyle: "italic" }}>
                        {secondary ? (
                          <>{primary} ({item.primary_split_ratio}%) + {secondary} ({item.secondary_split_ratio}%)</>
                        ) : (
                          <>{primary || "Salon Staff"}</>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "center", padding: "2px 1px", fontWeight: "bold" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", padding: "2px 1px" }}>{item.unit_price.toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: "2px 1px", fontWeight: "bold" }}>{item.total_price.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TOTALS & TAX BREAKDOWN */}
      <div style={{ padding: "4px 0", borderBottom: "1px dashed #000000", fontSize: "9.5px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal:</span>
          <span>{formatCurrency(invoice.subtotal, settings.currency_symbol)}</span>
        </div>

        {invoice.discount_amount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#222222" }}>
            <span>Discount:</span>
            <span>-{formatCurrency(invoice.discount_amount, settings.currency_symbol)}</span>
          </div>
        )}

        {invoice.tax_amount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#444444" }}>
            <span>GST ({invoice.tax_rate}%):</span>
            <span>+{formatCurrency(invoice.tax_amount, settings.currency_symbol)}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "2px", borderTop: "1.5px solid #000000", fontSize: isA4 ? "13px" : "11px", fontWeight: "900" }}>
          <span>GRAND TOTAL:</span>
          <span>{formatCurrency(invoice.grand_total, settings.currency_symbol)}</span>
        </div>
      </div>

      {/* PAYMENT SETTLEMENT */}
      <div style={{ padding: "3px 0", borderBottom: "1px dashed #000000", fontSize: "9px", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
        <span>PAID: <span style={{ textTransform: "uppercase" }}>{invoice.payment_mode}</span></span>
        <span style={{ color: "#000000" }}>STATUS: {invoice.status.toUpperCase()}</span>
      </div>

      {/* DYNAMIC SCANNABLE QR CODES */}
      <div style={{ padding: "6px 0 4px 0", textAlign: "center", borderBottom: "1.5px dashed #000000" }}>
        <div style={{ fontSize: "8.5px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>
          ⭐ Review Us & Follow 📸
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px" }}>
          {/* GOOGLE REVIEW QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <QrCodeImage
              value={googleReviewUrl}
              size={qrSize}
              alt="Google Review QR"
            />
            <span style={{ fontSize: "8px", fontWeight: "bold", marginTop: "2px", color: "#000000" }}>
              Google Review
            </span>
          </div>

          {/* INSTAGRAM QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <QrCodeImage
              value={instagramUrl}
              size={qrSize}
              alt="Instagram QR"
            />
            <span style={{ fontSize: "8px", fontWeight: "bold", marginTop: "2px", color: "#000000" }}>
              {instaHandle}
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER MESSAGE */}
      <div style={{ paddingTop: "4px", textAlign: "center", fontSize: "8px", color: "#555555" }}>
        <p style={{ fontWeight: "bold", color: "#111111", margin: "0" }}>Thank you for visiting {settings.salon_name}!</p>
        <p style={{ margin: "1px 0 0 0", color: "#888888" }}>Powered by SalonPOS Suite</p>
      </div>
    </div>
  );
}
