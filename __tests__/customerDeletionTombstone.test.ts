import { describe, it, expect, beforeEach } from "vitest";
import { Storage } from "@/lib/storage";
import { unifyCustomerList, deduplicateCustomerArray, normalizePhoneNumber } from "@/lib/customerUtils";
import { Customer, Invoice } from "@/types";

// Mock browser window & localStorage in Node environment
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

describe("Customer Deletion & Tombstone Resilience Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deletes customer Prabhat jain (9250755655) and prevents resurrection from cloud sync", () => {
    // 1. Setup customer Prabhat jain with phone 9250755655
    const customer: Customer = {
      id: "cust-prabhat-1",
      name: "Prabhat jain",
      phone: "9250755655",
      gender: "female",
      total_visits: 1,
      total_spent: 500,
      created_at: new Date().toISOString(),
    };

    Storage.saveCustomer(customer);
    expect(Storage.getCustomers().length).toBe(1);
    expect(Storage.getCustomers()[0].name).toBe("Prabhat jain");

    // 2. Delete customer using deleteCustomer
    Storage.deleteCustomer("cust-prabhat-1", "9250755655");

    // 3. Verify removed from Storage.getCustomers()
    expect(Storage.getCustomers().length).toBe(0);

    // 4. Verify tombstone created for both ID and normalized phone
    const tombstones = Storage.getDeletedCustomers();
    expect(tombstones).toContain("cust-prabhat-1");
    expect(tombstones).toContain("9250755655");
    expect(Storage.isCustomerDeleted("cust-prabhat-1", "9250755655")).toBe(true);

    // 5. Simulate cloud sync (loadAllData or syncIncremental) returning Prabhat jain from Supabase
    const cloudCustomers: Customer[] = [
      {
        id: "cust-prabhat-1",
        name: "Prabhat jain",
        phone: "9250755655",
        gender: "female",
        total_visits: 1,
        total_spent: 500,
      },
      {
        id: "cust-other-2",
        name: "Other Customer",
        phone: "9876543210",
        gender: "male",
        total_visits: 2,
        total_spent: 1000,
      },
    ];

    // Filter cloud data against tombstones as AppContext does
    const deletedSet = new Set(Storage.getDeletedCustomers());
    const validCloud = cloudCustomers.filter(
      (c) => !(c.id && deletedSet.has(c.id)) && !(c.phone && deletedSet.has(normalizePhoneNumber(c.phone)))
    );
    const localCustomers = Storage.getCustomers().filter(
      (c) => !(c.id && deletedSet.has(c.id)) && !(c.phone && deletedSet.has(normalizePhoneNumber(c.phone)))
    );

    const merged = deduplicateCustomerArray([...validCloud, ...localCustomers]);
    Storage.saveCustomers(merged);

    // 6. Verify Prabhat jain is NOT resurrected
    const refreshedCustomers = Storage.getCustomers();
    expect(refreshedCustomers.length).toBe(1);
    expect(refreshedCustomers[0].name).toBe("Other Customer");
    expect(refreshedCustomers.some((c) => normalizePhoneNumber(c.phone) === "9250755655")).toBe(false);
  });

  it("unifyCustomerList omits deleted customer even if historical invoices exist", () => {
    // Invoice exists for Prabhat jain
    const invoices: Invoice[] = [
      {
        id: "inv-prabhat-1",
        invoice_number: "BZ-9999",
        customer_id: "cust-prabhat-1",
        customer_name: "Prabhat jain",
        customer_phone: "9250755655",
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
        created_at: new Date().toISOString(),
        items: [],
      },
    ];

    // Customer has been tombstoned
    Storage.addDeletedCustomer("cust-prabhat-1");
    Storage.addDeletedCustomer("9250755655");

    const deletedSet = new Set(Storage.getDeletedCustomers());
    const unified = unifyCustomerList([], invoices, deletedSet);

    // Should not resurrect or display in CRM unified list
    expect(unified.length).toBe(0);
  });

  it("unlinks invoice customer_id when customer is deleted without destroying financial invoice records", () => {
    const customer: Customer = {
      id: "cust-audit-1",
      name: "Audit Client",
      phone: "9123456780",
      gender: "male",
    };
    Storage.saveCustomer(customer);

    const invoice: Invoice = {
      id: "inv-audit-1",
      invoice_number: "BZ-AUDIT-1",
      customer_id: "cust-audit-1",
      customer_name: "Audit Client",
      customer_phone: "9123456780",
      customer_gender: "male",
      subtotal: 800,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 800,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [],
    };
    Storage.createInvoice(invoice);

    // Verify invoice is linked
    expect(Storage.getInvoices()[0].customer_id).toBe("cust-audit-1");

    // Delete customer
    Storage.deleteCustomer("cust-audit-1", "9123456780");

    // Customer is deleted
    expect(Storage.getCustomers().some((c) => c.id === "cust-audit-1")).toBe(false);

    // Invoice still exists with all financial details, but customer_id is unlinked
    const savedInvoices = Storage.getInvoices();
    expect(savedInvoices.length).toBe(1);
    expect(savedInvoices[0].customer_id).toBeUndefined();
    expect(savedInvoices[0].grand_total).toBe(800);
    expect(savedInvoices[0].customer_name).toBe("Audit Client");
  });

  it("clears tombstone if customer is intentionally re-created", () => {
    Storage.addDeletedCustomer("9250755655");
    expect(Storage.isCustomerDeleted(undefined, "9250755655")).toBe(true);

    // Deliberate re-creation
    Storage.saveCustomer({
      id: "new-cust-1",
      name: "New Profile",
      phone: "9250755655",
      gender: "female",
    });

    expect(Storage.isCustomerDeleted(undefined, "9250755655")).toBe(false);
    expect(Storage.getCustomers().length).toBe(1);
    expect(Storage.getCustomers()[0].name).toBe("New Profile");
  });
});
