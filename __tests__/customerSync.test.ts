import { describe, it, expect } from "vitest";
import { unifyCustomerList, deduplicateCustomerArray, normalizePhoneNumber } from "@/lib/customerUtils";
import { Customer, Invoice } from "@/types";

describe("Database & Customer Directory Count Parity Test", () => {
  it("ensures Customer Directory & CRM unified count matches DB registered customer count when fully synced", () => {
    // 1. Mock DB customer records in Supabase
    const dbCustomers: Customer[] = [
      {
        id: "cust-1",
        name: "Mohit",
        phone: "8168584831",
        gender: "male",
        total_visits: 1,
        total_spent: 250,
      },
      {
        id: "cust-2",
        name: "Vishakha",
        phone: "9958872996",
        gender: "female",
        total_visits: 1,
        total_spent: 500,
      },
      {
        id: "cust-3",
        name: "Sonika",
        phone: "6378107453",
        gender: "female",
        total_visits: 1,
        total_spent: 30,
      },
    ];

    // 2. Mock Invoices referencing existing and discovered customers
    const invoices: Invoice[] = [
      {
        id: "inv-1",
        invoice_number: "BZ-1001",
        customer_id: "cust-1",
        customer_name: "Mohit",
        customer_phone: "8168584831",
        customer_gender: "male",
        subtotal: 250,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 250,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-26T10:00:00Z",
        items: [],
      },
      {
        id: "inv-2",
        invoice_number: "BZ-1002",
        customer_id: "cust-2",
        customer_name: "Vishakha",
        customer_phone: "9958872996",
        customer_gender: "female",
        subtotal: 500,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 500,
        payment_mode: "upi",
        status: "paid",
        created_at: "2026-08-26T11:00:00Z",
        items: [],
      },
      {
        id: "inv-3",
        invoice_number: "BZ-1003",
        customer_id: "cust-3",
        customer_name: "Sonika",
        customer_phone: "6378107453",
        customer_gender: "female",
        subtotal: 30,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 30,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-26T12:00:00Z",
        items: [],
      },
    ];

    const deduplicatedDb = deduplicateCustomerArray(dbCustomers);
    const unifiedCrm = unifyCustomerList(dbCustomers, invoices);

    // Verify 1-to-1 count match between DB and CRM directory
    expect(unifiedCrm.length).toBe(deduplicatedDb.length);
    expect(unifiedCrm.length).toBe(3);
  });

  it("handles duplicate phone formats consistently between DB records and CRM directory", () => {
    const rawDb: Customer[] = [
      { id: "1", name: "Rahul", phone: "9876543210", gender: "male", total_visits: 1, total_spent: 100 },
      { id: "2", name: "Rahul Sharma", phone: "+91 98765 43210", gender: "male", total_visits: 2, total_spent: 300 },
    ];

    const deduplicated = deduplicateCustomerArray(rawDb);
    const unified = unifyCustomerList(rawDb, []);

    expect(deduplicated.length).toBe(1);
    expect(unified.length).toBe(1);
    expect(unified[0].phone).toBe("9876543210");
  });

  it("calculates exact total_visits and total_spent across multiple visits and ignores void invoices", () => {
    const dbCustomers: Customer[] = [
      {
        id: "cust-talat",
        name: "Talat",
        phone: "6200696360",
        gender: "female",
        total_visits: 0,
        total_spent: 0,
      },
    ];

    const invoices: Invoice[] = [
      {
        id: "inv-t1",
        invoice_number: "BZ-2001",
        customer_id: "cust-talat",
        customer_name: "Talat",
        customer_phone: "6200696360",
        subtotal: 150,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 150,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-20T10:00:00Z",
        items: [],
      },
      {
        id: "inv-t2",
        invoice_number: "BZ-2002",
        customer_id: "cust-talat",
        customer_name: "Talat",
        customer_phone: "+91 6200696360",
        subtotal: 500,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 500,
        payment_mode: "upi",
        status: "paid",
        created_at: "2026-08-26T10:00:00Z",
        items: [],
      },
      {
        id: "inv-t3",
        invoice_number: "BZ-2003",
        customer_id: "cust-talat",
        customer_name: "Talat",
        customer_phone: "6200696360",
        subtotal: 300,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 300,
        payment_mode: "cash",
        status: "void", // VOIDED INVOICE - MUST BE EXCLUDED!
        created_at: "2026-08-26T11:00:00Z",
        items: [],
      },
    ];

    const unified = unifyCustomerList(dbCustomers, invoices);
    expect(unified.length).toBe(1);
    expect(unified[0].name).toBe("Talat");
    // Visits should be exactly 2 (excluding the voided invoice)
    expect(unified[0].total_visits).toBe(2);
    // Spend should be exactly 150 + 500 = 650 (excluding voided 300)
    expect(unified[0].total_spent).toBe(650);
  });

  it("strictly isolates statistics for different customers who share the same name but have different phone numbers", () => {
    const dbCustomers: Customer[] = [
      {
        id: "cust-yash-1",
        name: "Yash",
        phone: "7007929773",
        gender: "male",
        total_visits: 0,
        total_spent: 0,
      },
      {
        id: "cust-yash-2",
        name: "Yash",
        phone: "9839124767",
        gender: "male",
        total_visits: 0,
        total_spent: 0,
      },
    ];

    const invoices: Invoice[] = [
      {
        id: "inv-y1",
        invoice_number: "BZ-3001",
        customer_id: "cust-yash-1",
        customer_name: "Yash",
        customer_phone: "7007929773",
        subtotal: 150,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 150,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-26T10:00:00Z",
        items: [],
      },
      {
        id: "inv-y2",
        invoice_number: "BZ-3002",
        customer_id: "cust-yash-2",
        customer_name: "Yash",
        customer_phone: "9839124767",
        subtotal: 250,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 250,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-26T10:00:00Z",
        items: [],
      },
    ];

    const unified = unifyCustomerList(dbCustomers, invoices);
    expect(unified.length).toBe(2);

    const yash1 = unified.find((c) => c.phone === "7007929773");
    const yash2 = unified.find((c) => c.phone === "9839124767");

    expect(yash1).toBeDefined();
    expect(yash1?.total_visits).toBe(1);
    expect(yash1?.total_spent).toBe(150); // NOT combined 400!

    expect(yash2).toBeDefined();
    expect(yash2?.total_visits).toBe(1);
    expect(yash2?.total_spent).toBe(250); // NOT combined 400!
  });
});
