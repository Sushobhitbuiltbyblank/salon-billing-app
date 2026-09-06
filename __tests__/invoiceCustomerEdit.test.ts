import { describe, it, expect, beforeEach } from "vitest";
import { Storage, initStorage } from "@/lib/storage";
import { unifyCustomerList, deduplicateCustomerArray, normalizePhoneNumber } from "@/lib/customerUtils";
import { Customer, Invoice } from "@/types";

// Mock localStorage in test environment
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();
global.localStorage = mockStorage as any;
(global as any).window = { localStorage: mockStorage };

describe("Invoice Customer Detail Editing & Client Reconciliation", () => {
  beforeEach(() => {
    localStorage.clear();
    initStorage();
  });

  it("updates existing client details in-place when invoice client phone is edited, and does NOT create a new client", () => {
    // 1. Initial State: A bill was created for a client with an initial typo in the phone number
    const initialCustomerId = "cust-client-001";
    const typoPhone = "9810011111";
    const correctedPhone = "9810022222";

    const initialCustomer: Customer = {
      id: initialCustomerId,
      name: "Swati ji",
      phone: typoPhone,
      gender: "female",
      total_visits: 1,
      total_spent: 400,
      created_at: "2026-09-06T06:44:37Z",
    };

    Storage.saveCustomer(initialCustomer);

    const initialInvoice: Invoice = {
      id: "inv-client-001",
      invoice_number: "BZ-99990001",
      customer_id: initialCustomerId,
      customer_name: "Swati ji",
      customer_phone: typoPhone,
      customer_gender: "female",
      subtotal: 400,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 400,
      payment_mode: "cash",
      status: "paid",
      created_at: "2026-09-06T06:44:37Z",
      items: [],
    };

    Storage.createInvoice(initialInvoice);

    // Verify initial storage has exactly 1 customer with the typo phone
    const customersBeforeEdit = Storage.getCustomers();
    expect(customersBeforeEdit.length).toBe(1);
    expect(customersBeforeEdit[0].id).toBe(initialCustomerId);
    expect(normalizePhoneNumber(customersBeforeEdit[0].phone)).toBe(typoPhone);

    // 2. Action: Cashier opens EditInvoiceModal and edits the invoice with the corrected phone number
    const updatedInvoice: Invoice = {
      ...initialInvoice,
      customer_phone: correctedPhone,
      customer_name: "Swati", // updated spelling
    };

    // Update the invoice through Storage.updateInvoice
    Storage.updateInvoice(updatedInvoice);

    // 3. Reconcile Customer details in-place (same logic as EditInvoiceModal & saveCustomer)
    const existingCustomer = customersBeforeEdit.find((c) => c.id === initialCustomerId);
    expect(existingCustomer).toBeDefined();

    const savedUpdatedCustomer = Storage.saveCustomer({
      id: existingCustomer!.id, // Same ID, not generating a new ID
      name: updatedInvoice.customer_name,
      phone: correctedPhone,
      gender: "female",
      total_visits: 1,
      total_spent: 400,
      created_at: existingCustomer!.created_at,
    });

    // 4. Verification: Storage must have ONLY 1 customer, with the corrected phone number and same ID
    const customersAfterEdit = Storage.getCustomers();
    expect(customersAfterEdit.length).toBe(1);
    expect(customersAfterEdit[0].id).toBe(initialCustomerId);
    expect(normalizePhoneNumber(customersAfterEdit[0].phone)).toBe(correctedPhone);
    expect(customersAfterEdit[0].name).toBe("Swati");

    // 5. Verification: Unified CRM directory must show only 1 client profile with 1 visit
    const unifiedCrmList = unifyCustomerList(customersAfterEdit, Storage.getInvoices());
    expect(unifiedCrmList.length).toBe(1);
    expect(unifiedCrmList[0].id).toBe(initialCustomerId);
    expect(normalizePhoneNumber(unifiedCrmList[0].phone)).toBe(correctedPhone);
    expect(unifiedCrmList[0].total_visits).toBe(1);
    expect(unifiedCrmList[0].total_spent).toBe(400);
  });

  it("updates customer phone and name from linked invoice in unifyCustomerList", () => {
    // When an invoice has an updated customer_phone and is linked to a customer_id,
    // unifyCustomerList should reflect the updated phone number on that customer profile
    const registeredCustomer: Customer = {
      id: "cust-test-100",
      name: "Prerna",
      phone: "9811000000",
      gender: "female",
      total_visits: 1,
      total_spent: 800,
    };

    const updatedInvoice: Invoice = {
      id: "inv-test-100",
      invoice_number: "BZ-9999",
      customer_id: "cust-test-100",
      customer_name: "Prerna Kapoor",
      customer_phone: "9811999999", // corrected phone on invoice
      customer_gender: "female",
      subtotal: 800,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 800,
      payment_mode: "upi",
      status: "paid",
      created_at: "2026-09-06T10:00:00Z",
      items: [],
    };

    const unified = unifyCustomerList([registeredCustomer], [updatedInvoice]);

    // Must have exactly 1 customer, updated with the phone from the invoice
    expect(unified.length).toBe(1);
    expect(unified[0].id).toBe("cust-test-100");
    expect(normalizePhoneNumber(unified[0].phone)).toBe("9811999999");
    expect(unified[0].name).toBe("Prerna Kapoor");
    expect(unified[0].total_visits).toBe(1);
    expect(unified[0].total_spent).toBe(800);
  });

  it("links to existing customer and removes orphaned typo profile when edited phone matches an existing customer", () => {
    // Suppose Customer A was accidentally created with a typo phone.
    // Customer B already exists with the real phone 9811122233.
    const typoCustomer: Customer = {
      id: "cust-typo-1",
      name: "Anjali",
      phone: "9811100000",
      gender: "female",
      total_visits: 1,
      total_spent: 500,
    };

    const realCustomer: Customer = {
      id: "cust-real-2",
      name: "Anjali Verma",
      phone: "9811122233",
      gender: "female",
      total_visits: 3,
      total_spent: 2500,
    };

    Storage.saveCustomers([typoCustomer, realCustomer]);

    const invoice: Invoice = {
      id: "inv-edit-phone",
      invoice_number: "BZ-5500",
      customer_id: "cust-typo-1",
      customer_name: "Anjali",
      customer_phone: "9811100000",
      customer_gender: "female",
      subtotal: 500,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 500,
      payment_mode: "cash",
      status: "paid",
      created_at: "2026-09-06T11:00:00Z",
      items: [],
    };

    Storage.createInvoice(invoice);

    // Cashier edits invoice: changes phone to realCustomer's phone (9811122233)
    const allCustomers = Storage.getCustomers();
    const cleanNewPhone = "9811122233";
    const existingWithNewPhone = allCustomers.find(
      (c) => normalizePhoneNumber(c.phone) === cleanNewPhone && c.id !== typoCustomer.id
    );

    expect(existingWithNewPhone).toBeDefined();
    expect(existingWithNewPhone!.id).toBe("cust-real-2");

    // The invoice is re-linked to cust-real-2
    const reLinkedInvoice: Invoice = {
      ...invoice,
      customer_id: existingWithNewPhone!.id,
      customer_phone: cleanNewPhone,
    };
    Storage.updateInvoice(reLinkedInvoice);

    // Typo customer has no other invoices left -> delete it
    Storage.deleteCustomer("cust-typo-1");

    // Verify only real customer remains
    const finalCustomers = Storage.getCustomers();
    expect(finalCustomers.length).toBe(1);
    expect(finalCustomers[0].id).toBe("cust-real-2");
    expect(normalizePhoneNumber(finalCustomers[0].phone)).toBe("9811122233");

    // CRM directory shows only 1 client with all visits correctly calculated
    const crmDirectory = unifyCustomerList(finalCustomers, Storage.getInvoices());
    expect(crmDirectory.length).toBe(1);
    expect(crmDirectory[0].id).toBe("cust-real-2");
    expect(crmDirectory[0].total_visits).toBe(1);
    expect(crmDirectory[0].total_spent).toBe(500);
  });
});
