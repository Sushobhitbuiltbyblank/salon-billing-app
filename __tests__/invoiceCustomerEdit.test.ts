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

  it("updates client details directly from Client CRM, propagates changes to linked invoices, and prevents reverting", () => {
    localStorage.clear();

    const customer: Customer = {
      id: "cust-crm-edit-1",
      name: "Swati ji",
      phone: "8118298469",
      gender: "female",
      email: "swati@example.com",
      birthday: "1995-05-15",
      notes: "VIP Client",
      total_visits: 1,
      total_spent: 400,
    };
    Storage.saveCustomer(customer);

    const invoice: Invoice = {
      id: "inv-swati-1",
      invoice_number: "BZ-20260906-5532",
      customer_id: "cust-crm-edit-1",
      customer_name: "Swati ji",
      customer_phone: "8118298469",
      customer_gender: "female",
      subtotal: 400,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 400,
      payment_mode: "upi",
      status: "paid",
      created_at: "2026-09-06T06:44:37.198Z",
      items: [],
    };
    Storage.createInvoice(invoice);

    // User edits customer in CRM: changes name to shorter name "Swati", changes phone to "8118298469", clears email
    const editedInCrm: Customer = {
      id: "cust-crm-edit-1",
      name: "Swati",
      phone: "8118298469",
      gender: "female",
      email: "", // user cleared email
      birthday: "1995-05-15",
      notes: "Preferred stylist: Priya",
      total_visits: 1,
      total_spent: 400,
    };
    const saved = Storage.saveCustomer(editedInCrm);

    expect(saved.name).toBe("Swati");
    expect(saved.email).toBeUndefined(); // email was cleared
    expect(saved.notes).toBe("Preferred stylist: Priya");

    // Verify linked invoice was also updated
    const updatedInvoices = Storage.getInvoices();
    const linkedInv = updatedInvoices.find((inv) => inv.id === "inv-swati-1");
    expect(linkedInv).toBeDefined();
    expect(linkedInv!.customer_name).toBe("Swati");
    expect(linkedInv!.customer_phone).toBe("8118298469");

    // Verify unifyCustomerList does not revert the CRM edit to the old invoice name
    const unified = unifyCustomerList(Storage.getCustomers(), Storage.getInvoices());
    expect(unified.length).toBe(1);
    expect(unified[0].name).toBe("Swati");
    expect(unified[0].email).toBeUndefined();
    expect(unified[0].notes).toBe("Preferred stylist: Priya");
    expect(unified[0].total_visits).toBe(1);
    expect(unified[0].total_spent).toBe(400);
  });

  it("updates customer name from aarti to aditi and phone number in invoice, and older invoices do NOT revert the CRM detail", () => {
    localStorage.clear();

    const customerId = "390a10bd-6aca-48e1-bc65-7f152ba81df0";
    const initialPhone = "9716462401";

    const customer: Customer = {
      id: customerId,
      name: "aarti ji",
      phone: initialPhone,
      gender: "female",
      total_visits: 2,
      total_spent: 1550,
      created_at: "2026-09-07T15:05:30.000Z",
      updated_at: "2026-09-07T15:05:30.000Z",
    };
    Storage.saveCustomer(customer);

    // Older invoice from 2 days ago
    const olderInvoice: Invoice = {
      id: "inv-older-1",
      invoice_number: "BZ-20260907-6690",
      customer_id: customerId,
      customer_name: "aarti ji",
      customer_phone: initialPhone,
      subtotal: 650,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 650,
      payment_mode: "cash",
      status: "paid",
      created_at: "2026-09-07T15:05:30.000Z",
      items: [],
    };
    Storage.createInvoice(olderInvoice);

    // Newer invoice from today
    const newerInvoice: Invoice = {
      id: "inv-newer-2",
      invoice_number: "BZ-20260909-1321",
      customer_id: customerId,
      customer_name: "aarti ji",
      customer_phone: initialPhone,
      subtotal: 900,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 900,
      payment_mode: "upi",
      status: "paid",
      created_at: "2026-09-09T15:00:52.000Z",
      items: [],
    };
    Storage.createInvoice(newerInvoice);

    // Cashier edits invoice BZ-20260909-1321: changes name from "aarti ji" to "Aditi" and updates phone to "9716462499"
    const correctedPhone = "9716462499";
    const updatedInvoice: Invoice = {
      ...newerInvoice,
      customer_name: "Aditi",
      customer_phone: correctedPhone,
    };

    // Update invoice in Storage
    Storage.updateInvoice(updatedInvoice);

    // Verify customer profile in storage was updated
    const customersInStorage = Storage.getCustomers();
    const targetCust = customersInStorage.find((c) => c.id === customerId);
    expect(targetCust).toBeDefined();
    expect(targetCust!.name).toBe("Aditi");
    expect(normalizePhoneNumber(targetCust!.phone)).toBe(correctedPhone);

    // Verify CRM unified list shows Aditi and corrected phone, NOT reverted by older invoice
    const crmList = unifyCustomerList(customersInStorage, Storage.getInvoices());
    expect(crmList.length).toBe(1);
    expect(crmList[0].id).toBe(customerId);
    expect(crmList[0].name).toBe("Aditi");
    expect(normalizePhoneNumber(crmList[0].phone)).toBe(correctedPhone);
    expect(crmList[0].total_visits).toBe(2);
    expect(crmList[0].total_spent).toBe(1550);
  });

  it("updates customer name from 'Priyanka.....' to 'Priyanka' and CRM preserves the updated name", () => {
    localStorage.clear();

    const customerId = "37f77587-2aca-457c-8c12-577d113fff29";
    const phone = "9818732459";

    const customer: Customer = {
      id: customerId,
      name: "Priyanka.....",
      phone: phone,
      gender: "female",
      total_visits: 1,
      total_spent: 500,
      created_at: "2026-09-09T13:44:21.000Z",
      updated_at: "2026-09-09T13:44:21.000Z",
    };
    Storage.saveCustomer(customer);

    const invoice: Invoice = {
      id: "inv-priyanka-1",
      invoice_number: "BZ-20260909-6741",
      customer_id: customerId,
      customer_name: "Priyanka.....",
      customer_phone: phone,
      subtotal: 500,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 500,
      payment_mode: "cash",
      status: "paid",
      created_at: "2026-09-09T13:44:21.000Z",
      items: [],
    };
    Storage.createInvoice(invoice);

    // Update customer in invoice to clean name "Priyanka"
    const updatedInvoice: Invoice = {
      ...invoice,
      customer_name: "Priyanka",
    };
    Storage.updateInvoice(updatedInvoice);

    // CRM unification must show "Priyanka"
    const crmList = unifyCustomerList(Storage.getCustomers(), Storage.getInvoices());
    expect(crmList.length).toBe(1);
    expect(crmList[0].name).toBe("Priyanka");
  });

  it("multi-device conflict resolution: Device B adopts Device A's customer updates based on newer updated_at timestamp", () => {
    // Device B currently has stale local cached customer "Aarti" with timestamp T1
    const deviceBCachedCustomer: Customer = {
      id: "cust-sync-version-1",
      name: "Aarti",
      phone: "9810011111",
      gender: "female",
      total_visits: 1,
      total_spent: 400,
      created_at: "2026-09-09T10:00:00.000Z",
      updated_at: "2026-09-09T10:00:00.000Z",
    };

    // Device A updated customer to "Aditi" with corrected phone "9810022222" at timestamp T2 (newer)
    const deviceACloudCustomer: Customer = {
      id: "cust-sync-version-1",
      name: "Aditi",
      phone: "9810022222",
      gender: "female",
      total_visits: 1,
      total_spent: 400,
      created_at: "2026-09-09T10:00:00.000Z",
      updated_at: "2026-09-09T12:30:00.000Z", // Newer!
    };

    // When Device B receives cloud update and runs deduplicateCustomerArray([...cloud, ...local])
    const mergedOnDeviceB = deduplicateCustomerArray([deviceACloudCustomer, deviceBCachedCustomer]);
    expect(mergedOnDeviceB.length).toBe(1);
    expect(mergedOnDeviceB[0].name).toBe("Aditi");
    expect(normalizePhoneNumber(mergedOnDeviceB[0].phone)).toBe("9810022222");
    expect(mergedOnDeviceB[0].updated_at).toBe("2026-09-09T12:30:00.000Z");

    // Also test reverse array order to ensure timestamp priority holds regardless of list order
    const mergedReverseOrder = deduplicateCustomerArray([deviceBCachedCustomer, deviceACloudCustomer]);
    expect(mergedReverseOrder.length).toBe(1);
    expect(mergedReverseOrder[0].name).toBe("Aditi");
    expect(normalizePhoneNumber(mergedReverseOrder[0].phone)).toBe("9810022222");
  });
});
