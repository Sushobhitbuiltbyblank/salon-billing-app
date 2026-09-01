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

  it("filters invoices correctly by product sale vs service sale", () => {
    const invProductOnly: Invoice = {
      id: "inv-p-only",
      invoice_number: "BEL-101",
      customer_name: "Customer P",
      customer_phone: "9999999991",
      subtotal: 500,
      grand_total: 500,
      status: "paid",
      payment_mode: "upi",
      created_at: new Date().toISOString(),
      items: [{ id: "p1", item_name: "Serum", item_type: "product", quantity: 1, unit_price: 500, total_price: 500 }],
    };

    const invServiceOnly: Invoice = {
      id: "inv-s-only",
      invoice_number: "BEL-102",
      customer_name: "Customer S",
      customer_phone: "9999999992",
      subtotal: 400,
      grand_total: 400,
      status: "paid",
      payment_mode: "cash",
      created_at: new Date().toISOString(),
      items: [{ id: "s1", item_name: "Beard Trim", item_type: "service", quantity: 1, unit_price: 400, total_price: 400 }],
    };

    const invMixed: Invoice = {
      id: "inv-mixed",
      invoice_number: "BEL-103",
      customer_name: "Customer M",
      customer_phone: "9999999993",
      subtotal: 900,
      grand_total: 900,
      status: "paid",
      payment_mode: "card",
      created_at: new Date().toISOString(),
      items: [
        { id: "s2", item_name: "Hair Cut", item_type: "service", quantity: 1, unit_price: 400, total_price: 400 },
        { id: "p2", item_name: "Wax", item_type: "product", quantity: 1, unit_price: 500, total_price: 500 },
      ],
    };

    const allInvoices = [invProductOnly, invServiceOnly, invMixed];

    const filterBySaleType = (invoices: Invoice[], saleType: string) => {
      return invoices.filter((inv) => {
        if (saleType === "all") return true;
        const hasProduct = inv.items?.some((it) => it.item_type === "product");
        const hasService = inv.items?.some((it) => it.item_type !== "product");

        if (saleType === "product" && !hasProduct) return false;
        if (saleType === "service" && !hasService) return false;
        if (saleType === "product_only" && (!hasProduct || hasService)) return false;
        if (saleType === "service_only" && (!hasService || hasProduct)) return false;
        return true;
      });
    };

    // 1. All sales returns all 3
    expect(filterBySaleType(allInvoices, "all").length).toBe(3);

    // 2. Product sale returns invoices with product (Product Only + Mixed)
    const productSales = filterBySaleType(allInvoices, "product");
    expect(productSales.map((i) => i.id)).toEqual(["inv-p-only", "inv-mixed"]);

    // 3. Service sale returns invoices with service (Service Only + Mixed)
    const serviceSales = filterBySaleType(allInvoices, "service");
    expect(serviceSales.map((i) => i.id)).toEqual(["inv-s-only", "inv-mixed"]);

    // 4. Product only returns only invProductOnly
    const productOnly = filterBySaleType(allInvoices, "product_only");
    expect(productOnly.map((i) => i.id)).toEqual(["inv-p-only"]);

    // 5. Service only returns only invServiceOnly
    const serviceOnly = filterBySaleType(allInvoices, "service_only");
    expect(serviceOnly.map((i) => i.id)).toEqual(["inv-s-only"]);
  });
});

