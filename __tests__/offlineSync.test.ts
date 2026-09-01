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

describe("Offline-First Invoice Sync & Two-Way Merge Architecture", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleLocalInvoice: Invoice = {
    id: "inv-local-001",
    invoice_number: "BEL-1001",
    customer_name: "Rohan Sharma",
    customer_phone: "9876543210",
    subtotal: 1000,
    discount_amount: 100,
    tax_amount: 0,
    tax_rate: 0,
    grand_total: 900,
    payment_mode: "cash",
    status: "paid",
    created_at: new Date(Date.now() - 60000).toISOString(),
    items: [
      {
        id: "item-1",
        item_name: "Hair Spa",
        item_type: "service",
        quantity: 1,
        unit_price: 1000,
        discount: 100,
        total_price: 900,
      },
    ],
  };

  const sampleCloudInvoice: Invoice = {
    id: "inv-cloud-002",
    invoice_number: "BEL-1002",
    customer_name: "Pooja Verma",
    customer_phone: "9123456789",
    subtotal: 500,
    discount_amount: 0,
    tax_amount: 0,
    tax_rate: 0,
    grand_total: 500,
    payment_mode: "upi",
    status: "paid",
    created_at: new Date().toISOString(),
    items: [
      {
        id: "item-2",
        item_name: "Hair Cut",
        item_type: "service",
        quantity: 1,
        unit_price: 500,
        discount: 0,
        total_price: 500,
      },
    ],
  };

  describe("1. Safe Two-Way Invoices Merge (No Lost Invoices)", () => {
    it("preserves local offline invoices that are not yet in cloud data", () => {
      const localInvoices = [sampleLocalInvoice];
      const cloudInvoices = [sampleCloudInvoice];

      // Merge local and cloud
      const merged = Storage.mergeInvoices(localInvoices, cloudInvoices);

      expect(merged).toHaveLength(2);
      expect(merged.some((i) => i.id === "inv-local-001")).toBe(true);
      expect(merged.some((i) => i.id === "inv-cloud-002")).toBe(true);
    });

    it("returns local invoices when cloud invoices list is empty", () => {
      const localInvoices = [sampleLocalInvoice];
      const cloudInvoices: Invoice[] = [];

      const merged = Storage.mergeInvoices(localInvoices, cloudInvoices);
      expect(merged).toHaveLength(1);
      expect(merged[0].id === "inv-local-001").toBe(true);
    });

    it("returns cloud invoices when local invoices list is empty", () => {
      const localInvoices: Invoice[] = [];
      const cloudInvoices = [sampleCloudInvoice];

      const merged = Storage.mergeInvoices(localInvoices, cloudInvoices);
      expect(merged).toHaveLength(1);
      expect(merged[0].id === "inv-cloud-002").toBe(true);
    });

    it("deduplicates invoices when the same invoice exists in both local and cloud", () => {
      const duplicateLocal = { ...sampleCloudInvoice };
      const localInvoices = [duplicateLocal];
      const cloudInvoices = [sampleCloudInvoice];

      const merged = Storage.mergeInvoices(localInvoices, cloudInvoices);
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe("inv-cloud-002");
    });

    it("preserves offline void status when local invoice is voided before cloud syncs", () => {
      // Local invoice is voided while offline
      const locallyVoided: Invoice = {
        ...sampleCloudInvoice,
        status: "void",
      };

      // Mark it in the pending queue
      Storage.addToInvoiceSyncQueue(locallyVoided.id);

      // Cloud still has old status "paid"
      const cloudStillPaid = { ...sampleCloudInvoice, status: "paid" as const };

      const merged = Storage.mergeInvoices([locallyVoided], [cloudStillPaid]);
      expect(merged).toHaveLength(1);
      expect(merged[0].status).toBe("void");
    });

    it("sorts merged invoices descending by created_at", () => {
      const olderInvoice: Invoice = {
        ...sampleLocalInvoice,
        id: "inv-older",
        created_at: new Date("2026-08-01T10:00:00Z").toISOString(),
      };
      const newerInvoice: Invoice = {
        ...sampleCloudInvoice,
        id: "inv-newer",
        created_at: new Date("2026-08-02T10:00:00Z").toISOString(),
      };

      const merged = Storage.mergeInvoices([olderInvoice], [newerInvoice]);
      expect(merged[0].id).toBe("inv-newer");
      expect(merged[1].id).toBe("inv-older");
    });
  });

  describe("2. Persistent Offline Sync Queue Management", () => {
    it("adds an invoice to the sync queue when createInvoice is called", () => {
      expect(Storage.getPendingInvoiceSyncQueue()).toHaveLength(0);

      Storage.createInvoice(sampleLocalInvoice);

      const queue = Storage.getPendingInvoiceSyncQueue();
      expect(queue).toContain(sampleLocalInvoice.id);
      expect(Storage.isInvoicePendingSync(sampleLocalInvoice.id)).toBe(true);
    });

    it("removes an invoice from the sync queue upon successful sync confirmation", () => {
      Storage.addToInvoiceSyncQueue("inv-test-123");
      expect(Storage.isInvoicePendingSync("inv-test-123")).toBe(true);

      Storage.removeFromInvoiceSyncQueue("inv-test-123");
      expect(Storage.isInvoicePendingSync("inv-test-123")).toBe(false);
      expect(Storage.getPendingInvoiceSyncQueue()).toHaveLength(0);
    });

    it("removes an invoice from sync queue when permanently deleted", () => {
      Storage.createInvoice(sampleLocalInvoice);
      expect(Storage.isInvoicePendingSync(sampleLocalInvoice.id)).toBe(true);

      Storage.deleteInvoice(sampleLocalInvoice.id);
      expect(Storage.isInvoicePendingSync(sampleLocalInvoice.id)).toBe(false);
    });

    it("adds an invoice to sync queue when voided offline so void status will sync", () => {
      Storage.createInvoice(sampleLocalInvoice);
      Storage.removeFromInvoiceSyncQueue(sampleLocalInvoice.id);
      expect(Storage.isInvoicePendingSync(sampleLocalInvoice.id)).toBe(false);

      Storage.voidInvoice(sampleLocalInvoice.id);
      expect(Storage.isInvoicePendingSync(sampleLocalInvoice.id)).toBe(true);
    });

    it("archives all created invoices to append-only archive and revives them if local invoices are wiped", () => {
      Storage.createInvoice(sampleLocalInvoice);
      expect(Storage.getInvoicesArchive()).toHaveLength(1);
      expect(Storage.getInvoicesArchive()[0].id).toBe(sampleLocalInvoice.id);

      // Simulate a scenario where active invoices are accidentally wiped or overwritten
      Storage.saveInvoices([]);
      expect(Storage.getInvoices()).toHaveLength(0);

      // Safe merge with cloud data should automatically revive the invoice from append-only archive
      const merged = Storage.mergeInvoices(Storage.getInvoices(), []);
      expect(merged).toHaveLength(1);
      expect(merged[0].invoice_number).toBe(sampleLocalInvoice.invoice_number);
      expect(Storage.isInvoicePendingSync(sampleLocalInvoice.id)).toBe(true);
    });
  });
});
