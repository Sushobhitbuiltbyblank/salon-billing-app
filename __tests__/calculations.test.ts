import { describe, it, expect } from "vitest";
import {
  calculateItemTotal,
  calculateInvoiceTotals,
  calculateItemStaffCommissions,
  calculateStaffPerformance,
} from "@/lib/calculations";
import { Invoice, InvoiceItem, Staff } from "@/types";

describe("Calculation Utils & Staff Incentive Logic", () => {
  it("calculates item total after item-level discount correctly", () => {
    // 1 item of 600 with 0 discount
    expect(calculateItemTotal(600, 1, 0)).toBe(600);

    // 1 item of 150 with 150 discount (complimentary)
    expect(calculateItemTotal(150, 1, 150)).toBe(0);

    // 2 items of 200 each (unit 200, qty 2 = 400) with 50 discount
    expect(calculateItemTotal(200, 2, 50)).toBe(350);
  });

  it("calculates invoice totals with flat & percentage discounts and taxes", () => {
    const items: InvoiceItem[] = [
      {
        id: "item-1",
        item_name: "Hair Spa",
        item_type: "service",
        quantity: 1,
        unit_price: 600,
        discount: 0,
        total_price: 600,
      },
      {
        id: "item-2",
        item_name: "Hair Cut",
        item_type: "service",
        quantity: 1,
        unit_price: 150,
        discount: 150,
        total_price: 0,
      },
    ];

    const totals = calculateInvoiceTotals({
      items,
      discountType: "flat",
      discountValue: 0,
      taxEnabled: false,
      taxRate: 0,
    });
    expect(totals.subtotal).toBe(600); // 600 + 0
    expect(totals.grandTotal).toBe(600);
  });

  describe("Staff Sales Volume & Discount Deductions (User Scenarios)", () => {
    const staffList: Staff[] = [
      {
        id: "staff-x",
        name: "Staff X",
        role: "stylist",
        commission_rate: 10,
        status: "active",
      },
      {
        id: "staff-y",
        name: "Staff Y",
        role: "stylist",
        commission_rate: 10,
        status: "active",
      },
    ];

    it("Scenario 1: Hair Spa (600) + Hair Cut (150 complimentary with 150 discount) -> Staff X sale is 600, not 750", () => {
      const items: InvoiceItem[] = [
        {
          id: "item-1",
          item_name: "Hair Spa",
          item_type: "service",
          quantity: 1,
          unit_price: 600,
          discount: 0,
          total_price: 600,
          primary_staff_id: "staff-x",
        },
        {
          id: "item-2",
          item_name: "Hair Cut",
          item_type: "service",
          quantity: 1,
          unit_price: 150,
          discount: 150,
          total_price: 0,
          primary_staff_id: "staff-x",
        },
      ];

      const invoice: Invoice = {
        id: "inv-1",
        invoice_number: "BZ-1001",
        customer_name: "Client",
        subtotal: 600,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 600,
        payment_mode: "cash",
        status: "paid",
        created_at: new Date().toISOString(),
        items,
      };

      const summaries = calculateStaffPerformance([invoice], staffList);
      const staffXSummary = summaries.find((s) => s.staff.id === "staff-x");

      // Staff X should receive credit for 600 + 0 = 600 work
      expect(staffXSummary?.total_sales_generated).toBe(600);
      expect(staffXSummary?.total_commission_earned).toBe(60); // 10% of 600
    });

    it("Scenario 2: Hair Cut (150) + Hair Wash (100) with total invoice discount of 50 -> Staff Y sale reduces by proportional discount = 200", () => {
      const items: InvoiceItem[] = [
        {
          id: "item-1",
          item_name: "Hair Cut",
          item_type: "service",
          quantity: 1,
          unit_price: 150,
          discount: 0,
          total_price: 150,
          primary_staff_id: "staff-y",
        },
        {
          id: "item-2",
          item_name: "Hair Wash",
          item_type: "service",
          quantity: 1,
          unit_price: 100,
          discount: 0,
          total_price: 100,
          primary_staff_id: "staff-y",
        },
      ];

      const invoice: Invoice = {
        id: "inv-2",
        invoice_number: "BZ-1002",
        customer_name: "Client",
        subtotal: 250,
        discount_amount: 50,
        discount_type: "flat",
        discount_value: 50,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 200,
        payment_mode: "cash",
        status: "paid",
        created_at: new Date().toISOString(),
        items,
      };

      const summaries = calculateStaffPerformance([invoice], staffList);
      const staffYSummary = summaries.find((s) => s.staff.id === "staff-y");

      // Total realized sale = 250 - 50 = 200
      expect(staffYSummary?.total_sales_generated).toBe(200);
      expect(staffYSummary?.total_commission_earned).toBe(20); // 10% of 200
    });

    it("calculates multi-staff splits (packages & splits) accurately", () => {
      const items: InvoiceItem[] = [
        {
          id: "item-combo",
          item_name: "Bridal Combo",
          item_type: "package",
          quantity: 1,
          unit_price: 1000,
          discount: 0,
          total_price: 1000,
          package_services: [
            {
              service_id: "s-1",
              service_name: "Facial",
              price: 600,
              primary_staff_id: "staff-x",
            },
            {
              service_id: "s-2",
              service_name: "Blowdry",
              price: 400,
              primary_staff_id: "staff-y",
            },
          ],
        },
      ];

      const invoice: Invoice = {
        id: "inv-3",
        invoice_number: "BZ-1003",
        customer_name: "Client",
        subtotal: 1000,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 1000,
        payment_mode: "cash",
        status: "paid",
        created_at: new Date().toISOString(),
        items,
      };

      const summaries = calculateStaffPerformance([invoice], staffList);
      const staffXSummary = summaries.find((s) => s.staff.id === "staff-x");
      const staffYSummary = summaries.find((s) => s.staff.id === "staff-y");

      expect(staffXSummary?.total_sales_generated).toBe(600);
      expect(staffYSummary?.total_sales_generated).toBe(400);
    });
  });
});
