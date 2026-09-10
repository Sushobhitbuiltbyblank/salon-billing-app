import { describe, it, expect, beforeEach } from "vitest";
import { Storage } from "@/lib/storage";
import { Invoice } from "@/types";

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

describe("Incremental Sync & 5MB LocalStorage Quota Protection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const generateMockInvoice = (index: number, daysAgo: number = 0): Invoice => ({
    id: `inv-${index}`,
    invoice_number: `BZ-${20260000 + index}`,
    customer_name: `Customer ${index}`,
    customer_phone: `987654${String(index).padStart(4, "0")}`,
    subtotal: 1000,
    discount_amount: 0,
    tax_amount: 0,
    tax_rate: 0,
    grand_total: 1000,
    payment_mode: "upi",
    status: "paid",
    created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: `item-${index}`,
        item_name: "Service A",
        item_type: "service",
        quantity: 1,
        unit_price: 1000,
        discount: 0,
        total_price: 1000,
      },
    ],
  });

  describe("1. LocalStorage 5MB Quota Limit Protection (500 Invoices Cap)", () => {
    it("caps stored synced invoices to MAX_LOCAL_INVOICES (500)", () => {
      // Create 600 mock invoices
      const manyInvoices: Invoice[] = [];
      for (let i = 1; i <= 600; i++) {
        // Earlier index = newer invoice
        manyInvoices.push(generateMockInvoice(i, i * 0.1));
      }

      Storage.saveInvoices(manyInvoices);
      const retrieved = Storage.getInvoices();

      // Must be capped to 500
      expect(retrieved.length).toBe(500);
      // Ensure the newest invoices are kept (inv-1 to inv-500)
      expect(retrieved[0].id).toBe("inv-1");
      expect(retrieved[retrieved.length - 1].id).toBe("inv-500");
    });

    it("never evicts un-synced offline pending invoices even when exceeding 500", () => {
      // 1. Put 5 invoices into pending sync queue
      const pendingIds = ["pending-1", "pending-2", "pending-3", "pending-4", "pending-5"];
      Storage.savePendingInvoiceSyncQueue(pendingIds);

      // Create 550 synced invoices
      const invoicesList: Invoice[] = [];
      for (let i = 1; i <= 550; i++) {
        invoicesList.push(generateMockInvoice(i, i * 0.1));
      }

      // Add the 5 pending invoices, with old timestamps
      pendingIds.forEach((pId, idx) => {
        invoicesList.push({
          ...generateMockInvoice(9000 + idx, 100), // 100 days old
          id: pId,
          invoice_number: `BZ-PENDING-${pId}`,
        });
      });

      Storage.saveInvoices(invoicesList);
      const retrieved = Storage.getInvoices();

      // All 5 pending invoices MUST be preserved
      pendingIds.forEach((pId) => {
        expect(retrieved.some((inv) => inv.id === pId)).toBe(true);
      });

      // Total count should not exceed 500
      expect(retrieved.length).toBeLessThanOrEqual(500);
    });

    it("archiveInvoice keeps archive list capped to 500 items", () => {
      // Archive 500 invoices
      for (let i = 1; i <= 500; i++) {
        Storage.archiveInvoice(generateMockInvoice(i, i * 0.05));
      }

      // Archive an additional new invoice
      const newInv = generateMockInvoice(9999, 0);
      Storage.archiveInvoice(newInv);

      const retrievedArchive = Storage.getInvoicesArchive();
      expect(retrievedArchive.length).toBeLessThanOrEqual(500);
      expect(retrievedArchive.some((i) => i.id === "inv-9999")).toBe(true);
    });
  });

  describe("2. Sync Timestamp Management for Incremental Delta Syncing", () => {
    it("reads null initially when no sync timestamp is recorded", () => {
      expect(Storage.getLastSyncTimestamp()).toBeNull();
    });

    it("persists and returns lastSyncTimestamp correctly", () => {
      const testIso = new Date("2026-09-09T18:00:00.000Z").toISOString();
      Storage.saveLastSyncTimestamp(testIso);
      expect(Storage.getLastSyncTimestamp()).toBe(testIso);
    });
  });

  describe("3. Incremental Delta Merging Mechanics", () => {
    it("merges delta updates into existing local cache without duplicate keys", () => {
      const initialLocal = [
        generateMockInvoice(1, 1),
        generateMockInvoice(2, 2),
      ];
      Storage.saveInvoices(initialLocal);

      // Suppose cloud returns delta with an updated inv-2 and a new inv-3
      const deltaCloud: Invoice[] = [
        {
          ...initialLocal[1],
          grand_total: 1500, // updated amount
          notes: "Updated note from another tablet",
        },
        generateMockInvoice(3, 0.1), // brand new
      ];

      const merged = Storage.mergeInvoices(Storage.getInvoices(), deltaCloud);
      Storage.saveInvoices(merged);

      const afterSync = Storage.getInvoices();
      expect(afterSync.length).toBe(3);
      const inv2 = afterSync.find((i) => i.id === "inv-2");
      expect(inv2?.grand_total).toBe(1500);
      expect(inv2?.notes).toBe("Updated note from another tablet");
      expect(afterSync.some((i) => i.id === "inv-3")).toBe(true);
    });

    it("delta merge maintains offline pending invoices seamlessly", () => {
      const localPending = {
        ...generateMockInvoice(999, 0),
        id: "offline-pending-id",
        invoice_number: "BZ-OFFLINE-01",
      };
      Storage.addToInvoiceSyncQueue(localPending.id);

      const localInvoices = [localPending, generateMockInvoice(1, 1)];
      Storage.saveInvoices(localInvoices);

      // Cloud sends delta without the offline pending invoice
      const deltaCloud = [generateMockInvoice(2, 0.5)];
      const merged = Storage.mergeInvoices(Storage.getInvoices(), deltaCloud);
      Storage.saveInvoices(merged);

      const result = Storage.getInvoices();
      expect(result.some((i) => i.id === "offline-pending-id")).toBe(true);
      expect(result.some((i) => i.id === "inv-1")).toBe(true);
      expect(result.some((i) => i.id === "inv-2")).toBe(true);
    });
  });
});
