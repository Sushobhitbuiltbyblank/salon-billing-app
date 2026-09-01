import { describe, it, expect } from "vitest";
import { calculateInvoiceTotals } from "@/lib/calculations";
import { generateWhatsAppMessageText } from "@/lib/utils";
import { Invoice, InvoiceItem, SalonSettings } from "@/types";

describe("Product and Service Sales Separation", () => {
  const mockSettings: SalonSettings = {
    salon_name: "Belezia Salon Laxmi Nagar",
    tagline: "Luxury Beauty & Wellness",
    address: "Laxmi Nagar, Delhi",
    phone: "9876543210",
    email: "info@belezia.com",
    gstin: "07AAAAA0000A1Z5",
    currency_symbol: "₹",
    tax_enabled: true,
    tax_rate: 18,
    invoice_prefix: "BEL",
    google_review_url: "https://g.page/review",
    instagram_url: "https://instagram.com/belezia",
  };

  const mixedItems: InvoiceItem[] = [
    {
      id: "item-svc-1",
      item_name: "Hair Cut & Blowdry",
      item_type: "service",
      quantity: 1,
      unit_price: 600,
      discount: 0,
      total_price: 600,
    },
    {
      id: "item-pkg-1",
      item_name: "Bridal Glow Package",
      item_type: "package",
      quantity: 1,
      unit_price: 2400,
      discount: 200,
      total_price: 2200,
    },
    {
      id: "item-prod-1",
      item_name: "L'Oreal Absolute Repair Shampoo 300ml",
      item_type: "product",
      quantity: 2,
      unit_price: 750,
      discount: 100,
      total_price: 1400,
    },
  ];

  it("calculates separate services and retail products subtotals correctly", () => {
    const totals = calculateInvoiceTotals({
      items: mixedItems,
      discountType: "flat",
      discountValue: 0,
      taxEnabled: false,
      taxRate: 0,
    });

    // Services + Package = 600 + 2200 = 2800
    expect(totals.servicesSubtotal).toBe(2800);
    // Retail Product = 1400
    expect(totals.productsSubtotal).toBe(1400);
    // Combined subtotal = 2800 + 1400 = 4200
    expect(totals.subtotal).toBe(4200);
    expect(totals.servicesSubtotal + totals.productsSubtotal).toBe(totals.subtotal);
    // Grand total matches subtotal when discount is 0 and tax is false
    expect(totals.grandTotal).toBe(4200);
  });

  it("preserves invoice grand total unchanged with tax and invoice-level discount", () => {
    const totals = calculateInvoiceTotals({
      items: mixedItems,
      discountType: "flat",
      discountValue: 500, // 500 bill discount
      taxEnabled: true,
      taxRate: 18, // 18% GST on (4200 - 500) = 3700 * 0.18 = 666
    });

    expect(totals.servicesSubtotal).toBe(2800);
    expect(totals.productsSubtotal).toBe(1400);
    expect(totals.subtotal).toBe(4200);
    expect(totals.discountAmount).toBe(500);
    expect(totals.taxableAmount).toBe(3700);
    expect(totals.taxAmount).toBe(666);
    expect(totals.grandTotal).toBe(4366); // 3700 + 666
  });

  it("separates services and retail products in WhatsApp receipt while keeping grand total as is", () => {
    const invoice: Invoice = {
      id: "inv-sep-001",
      invoice_number: "BEL-3001",
      customer_name: "Neha Gupta",
      customer_phone: "9876543210",
      subtotal: 4200,
      discount_amount: 200,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 4000,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
      items: mixedItems,
    };

    const { text } = generateWhatsAppMessageText(invoice, mockSettings);

    // Verifies address is included and location icon is removed
    expect(text).toContain(mockSettings.address);
    expect(text).not.toContain("📍");

    // Verifies section separation
    expect(text).toContain("*SERVICES:*");
    expect(text).toContain("*PRODUCT:*");
    expect(text).toContain("Hair Cut & Blowdry");
    expect(text).toContain("L'Oreal Absolute Repair Shampoo");

    // Verifies separate subtotals in summary
    expect(text).toContain("Services Subtotal: ₹2800.00");
    expect(text).toContain("Product Subtotal: ₹1400.00");
    expect(text).toContain("Subtotal: ₹4200.00");

    // Verifies grand total is as it is
    expect(text).toContain("*Grand Total:* *₹4000.00*");
  });

  it("formats WhatsApp receipt normally without product section if only services are billed", () => {
    const serviceOnlyItems: InvoiceItem[] = [
      {
        id: "s1",
        item_name: "Hair Cut",
        item_type: "service",
        quantity: 1,
        unit_price: 200,
        discount: 0,
        total_price: 200,
      },
    ];

    const invoice: Invoice = {
      id: "inv-sep-002",
      invoice_number: "BEL-3002",
      customer_name: "Amit Patel",
      customer_phone: "9876543210",
      subtotal: 200,
      discount_amount: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 200,
      payment_mode: "cash",
      status: "paid",
      created_at: new Date().toISOString(),
      items: serviceOnlyItems,
    };

    const { text } = generateWhatsAppMessageText(invoice, mockSettings);

    expect(text).not.toContain("RETAIL PRODUCTS:");
    expect(text).not.toContain("Retail Products Subtotal:");
    expect(text).toContain("Hair Cut");
    expect(text).toContain("*Grand Total:* *₹200.00*");
  });
});
