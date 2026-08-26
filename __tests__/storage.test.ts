import { describe, it, expect, beforeEach } from "vitest";
import { Storage, initStorage, DEFAULT_SETTINGS, DEFAULT_USERS } from "@/lib/storage";
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

describe("Storage Layer & Local Data Operations", () => {
  beforeEach(() => {
    localStorage.clear();
    initStorage();
  });

  it("initializes default settings, staff, and users", () => {
    const settings = Storage.getSettings();
    expect(settings.currency_symbol).toBe("₹");
    expect(settings.salon_name).toBe("Belezia Salon Laxmi Nagar");

    const users = Storage.getUsers();
    expect(users.length).toBeGreaterThanOrEqual(3);
    expect(users.some((u) => u.name.includes("Sushobhit"))).toBe(true);
  });

  it("saves, deduplicates by phone, and updates customer gender cleanly", () => {
    const cust1: Customer = {
      id: "cust-1",
      name: "Vishakha",
      phone: "9958872996",
      gender: "female",
      total_visits: 1,
      total_spent: 500,
    };
    Storage.saveCustomer(cust1);

    const initialList = Storage.getCustomers();
    expect(initialList.length).toBe(1);
    expect(initialList[0].gender).toBe("female");

    // Update gender to other
    const updatedCust: Customer = {
      id: "cust-1",
      name: "Vishakha Sharma",
      phone: "+91 9958872996",
      gender: "other",
      total_visits: 2,
      total_spent: 1000,
    };
    Storage.saveCustomer(updatedCust);

    const freshList = Storage.getCustomers();
    expect(freshList.length).toBe(1); // Purged older duplicate
    expect(freshList[0].phone).toBe("9958872996");
    expect(freshList[0].gender).toBe("other");
    expect(freshList[0].name).toBe("Vishakha Sharma");
  });

  it("creates invoices and registers customer stats accurately", () => {
    const invoice: Invoice = {
      id: "inv-test-1",
      invoice_number: "BZ-9999",
      customer_name: "Rahul",
      customer_phone: "9876500000",
      customer_gender: "male",
      subtotal: 700,
      discount_amount: 100,
      discount_type: "flat",
      discount_value: 100,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 600,
      payment_mode: "cash",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "it-1",
          item_name: "Hair Cut",
          item_type: "service",
          quantity: 1,
          unit_price: 700,
          discount: 100,
          total_price: 600,
        },
      ],
    };

    Storage.createInvoice(invoice);

    const invoices = Storage.getInvoices();
    expect(invoices.some((inv) => inv.id === "inv-test-1")).toBe(true);

    const customers = Storage.getCustomers();
    const rahul = customers.find((c) => c.phone === "9876500000");
    expect(rahul).toBeDefined();
    expect(rahul?.gender).toBe("male");
    expect(rahul?.total_spent).toBe(600);
  });
});
