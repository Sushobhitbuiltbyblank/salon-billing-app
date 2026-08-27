import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Invoice, SalonSettings } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate valid RFC4122 UUID v4 for PostgreSQL database compatibility
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatCurrency(amount: number | undefined | null, symbol: string = "₹"): string {
  const value = Number(amount) || 0;
  return `${symbol}${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCompactNumber(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} k`;
  return amount.toString();
}

export function formatDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatShortDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function generateInvoiceNumber(prefix: string = "BZ-"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${month}${day}-${random}`;
}

export function getReceiptPublicUrl(invoice: Invoice): string {
  const baseUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://belezia-salon-billing-app.vercel.app";

  const identifier = invoice.invoice_number || invoice.id;
  return `${baseUrl}/receipt/${encodeURIComponent(identifier)}`;
}

export function generateWhatsAppMessageText(invoice: Invoice, settings: SalonSettings): { text: string; receiptUrl: string } {
  const receiptUrl = getReceiptPublicUrl(invoice);

  const items = invoice.items || [];
  const uniqueGuests = Array.from(
    new Set(items.map((i) => (i.guest_name || "").trim()).filter(Boolean))
  );

  let itemsText = "";
  if (uniqueGuests.length > 0) {
    const groupedMap = new Map<string, typeof items>();
    items.forEach((item) => {
      const gName = (item.guest_name || "").trim() || (invoice.customer_name || "General");
      if (!groupedMap.has(gName)) {
        groupedMap.set(gName, []);
      }
      groupedMap.get(gName)!.push(item);
    });

    const groupSections: string[] = [];
    let globalIndex = 1;
    groupedMap.forEach((gItems, gName) => {
      const gSubtotal = gItems.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0);
      const header = `👤 *${gName}* (${settings.currency_symbol}${gSubtotal.toFixed(2)}):`;
      const lines = gItems
        .map((item) => {
          let line = `  ${globalIndex++}. ${item.item_name} (${item.quantity}x) - ${settings.currency_symbol}${item.total_price.toFixed(2)}`;
          if (item.item_type === "package" && item.package_services && item.package_services.length > 0) {
            const subLines = item.package_services.map((ps) => `     └ • ${ps.guest_name ? `[${ps.guest_name}] ` : ""}${ps.service_name}: ₹${ps.price}`).join("\n");
            line += `\n${subLines}`;
          }
          return line;
        })
        .join("\n");
      groupSections.push(`${header}\n${lines}`);
    });
    itemsText = groupSections.join("\n\n");
  } else {
    itemsText = items
      .map((item, idx) => {
        let line = `${idx + 1}. *${item.item_name}* (${item.quantity}x) - ${settings.currency_symbol}${item.total_price.toFixed(2)}`;
        if (item.item_type === "package" && item.package_services && item.package_services.length > 0) {
          const subLines = item.package_services.map((ps) => `   └ • ${ps.guest_name ? `[${ps.guest_name}] ` : ""}${ps.service_name}: ₹${ps.price}`).join("\n");
          line += `\n${subLines}`;
        }
        return line;
      })
      .join("\n");
  }

  const message = `✨ *${settings.salon_name}* ✨
📍 _${settings.tagline}_
--------------------------------
🧾 *TAX INVOICE: ${invoice.invoice_number}*
📅 Date: ${formatDate(invoice.created_at)}
👤 Client: *${invoice.customer_name}*
--------------------------------
*SERVICES & PRODUCTS:*
${itemsText}
--------------------------------
Subtotal: ${settings.currency_symbol}${invoice.subtotal.toFixed(2)}
${invoice.discount_amount > 0 ? `Discount: -${settings.currency_symbol}${invoice.discount_amount.toFixed(2)}\n` : ""}${
    invoice.tax_amount > 0 ? `GST (${invoice.tax_rate}%): +${settings.currency_symbol}${invoice.tax_amount.toFixed(2)}\n` : ""
}*Grand Total:* *${settings.currency_symbol}${invoice.grand_total.toFixed(2)}*
Payment: *${invoice.payment_mode.toUpperCase()}* (${invoice.status.toUpperCase()})
--------------------------------
📄 *DOWNLOAD ORIGINAL BILL (PDF/IMAGE):*
👉 ${receiptUrl}
--------------------------------
🌟 *Rate your experience (5-Stars):*
${settings.google_review_url}

📸 Follow us on Instagram:
${settings.instagram_url}

Thank you for visiting ${settings.salon_name}! Have a fabulous day ahead! 💇‍♀️💅`;

  return { text: message, receiptUrl };
}

export function generateWhatsAppReceiptUrl(invoice: Invoice, settings: SalonSettings): string {
  const cleanPhone = (invoice.customer_phone || "").replace(/[^\d]/g, "");
  const { text } = generateWhatsAppMessageText(invoice, settings);
  const encoded = encodeURIComponent(text);

  return cleanPhone.length >= 10
    ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}
