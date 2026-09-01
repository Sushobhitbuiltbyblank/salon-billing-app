import { describe, it, expect } from "vitest";
import {
  calculateItemTotal,
  calculateInvoiceTotals,
  calculateStaffPerformance,
} from "@/lib/calculations";
import { generateWhatsAppMessageText } from "@/lib/utils";
import { Invoice, InvoiceItem, Staff, SalonSettings } from "@/types";

describe("Optional Stylist Billing & Quick Invoice Generation", () => {
  const mockSettings: SalonSettings = {
    salon_name: "Belezia Salon",
    tagline: "Luxury Salon Experience",
    address: "Laxmi Nagar, Delhi",
    phone: "9876543210",
    email: "info@belezia.com",
    gstin: "07AAAAA0000A1Z5",
    currency_symbol: "₹",
    tax_enabled: true,
    tax_rate: 18,
    invoice_prefix: "BEL",
    google_review_url: "https://g.page/review",
    instagram_url: "https://instagram.com",
  };

  it("calculates invoice totals with unassigned stylist", () => {
    const items: InvoiceItem[] = [
      {
        id: "item-1",
        item_name: "Hair cut",
        item_type: "service",
        quantity: 1,
        unit_price: 150,
        discount: 0,
        total_price: 150,
        // No primary_staff_id assigned
      },
      {
        id: "item-2",
        item_name: "Shave",
        item_type: "service",
        quantity: 1,
        unit_price: 100,
        discount: 0,
        total_price: 100,
        // No primary_staff_id assigned
      },
    ];

    const totals = calculateInvoiceTotals({
      items,
      discountType: "flat",
      discountValue: 0,
      taxEnabled: false,
      taxRate: 0,
    });

    expect(totals.subtotal).toBe(250);
    expect(totals.grandTotal).toBe(250);
  });

  it("handles staff performance gracefully when invoices have no assigned stylists", () => {
    const staffList: Staff[] = [
      {
        id: "staff-1",
        name: "Aman",
        role: "Senior Stylist",
        commission_percentage: 10,
        service_commission_rate: 10,
        product_commission_rate: 5,
        status: "active",
      },
    ];

    const unassignedInvoice: Invoice = {
      id: "inv-1",
      invoice_number: "BEL-1001",
      customer_name: "Walk-in Guest",
      customer_phone: "9876543210",
      subtotal: 500,
      discount_amount: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 500,
      payment_mode: "cash",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "item-1",
          item_name: "Hair Spa",
          item_type: "service",
          quantity: 1,
          unit_price: 500,
          discount: 0,
          total_price: 500,
          // No primary_staff_id assigned
        },
      ],
    };

    const performance = calculateStaffPerformance(staffList, [unassignedInvoice]);
    expect(performance).toHaveLength(1);
    expect(performance[0].total_sales_generated).toBe(0);
    expect(performance[0].total_commission_earned).toBe(0);
    expect(performance[0].services_count).toBe(0);
    expect(performance[0].invoices_count).toBe(0);
  });

  it("generates WhatsApp receipt text smoothly when stylist is unassigned", () => {
    const invoice: Invoice = {
      id: "inv-2",
      invoice_number: "BEL-1002",
      customer_name: "Aditi Rao",
      customer_phone: "9999888877",
      subtotal: 250,
      discount_amount: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 250,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "item-1",
          item_name: "Hair cut",
          item_type: "service",
          quantity: 1,
          unit_price: 150,
          discount: 0,
          total_price: 150,
        },
        {
          id: "item-2",
          item_name: "Shave",
          item_type: "service",
          quantity: 1,
          unit_price: 100,
          discount: 0,
          total_price: 100,
        },
      ],
    };

    const { text, receiptUrl } = generateWhatsAppMessageText(invoice, mockSettings);
    expect(text).toContain("TAX INVOICE: BEL-1002");
    expect(text).toContain("Hair cut");
    expect(text).toContain("Shave");
    expect(text).toContain("*Grand Total:* *₹250.00*");
    expect(receiptUrl).toBeDefined();
  });
});
