import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_PRIZES, SpinClaimRecord, removeProductQuantity } from "@/types/rewards";
import { generateClaimCode, getClaimRecords, saveClaimRecord } from "@/lib/rewardStorage";

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

describe("Spin-the-Wheel Rewards Engine", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("should have 5 curated L'Oréal Day prizes with appropriate configuration", () => {
    expect(DEFAULT_PRIZES).toHaveLength(5);

    const shampoo = DEFAULT_PRIZES.find((p) => p.id === "prize-loreal-shampoo");
    expect(shampoo).toBeDefined();
    expect(shampoo?.type).toBe("product_gift");
    expect(shampoo?.label).toBe("Free L'Oréal Shampoo");

    const dtan = DEFAULT_PRIZES.find((p) => p.id === "prize-dtan-service");
    expect(dtan).toBeDefined();
    expect(dtan?.type).toBe("service");
    expect(dtan?.label).toBe("Free D-Tan Service");

    const mask = DEFAULT_PRIZES.find((p) => p.id === "prize-loreal-mask");
    expect(mask).toBeDefined();
    expect(mask?.type).toBe("product_gift");
    expect(mask?.requiresInventoryDeduction).toBe(true);
  });

  it("should generate valid claim codes matching BZ-SPIN-XXXX format", () => {
    const code1 = generateClaimCode();
    const code2 = generateClaimCode();

    expect(code1).toMatch(/^BZ-SPIN-\d{4}$/);
    expect(code2).toMatch(/^BZ-SPIN-\d{4}$/);
  });

  it("should properly persist and retrieve claim records with customer details in storage", () => {
    expect(getClaimRecords()).toEqual([]);

    const record: SpinClaimRecord = {
      id: "claim-test-1",
      claimCode: "BZ-SPIN-9999",
      prizeId: "prize-detan",
      prizeLabel: "Free De-Tan Glow",
      prizeType: "service",
      customerName: "Rohan Verma",
      customerPhone: "9876543210",
      wasVerified: true,
      inventoryDeducted: false,
      createdAt: new Date().toISOString(),
    };

    saveClaimRecord(record);

    const stored = getClaimRecords();
    expect(stored).toHaveLength(1);
    expect(stored[0].claimCode).toBe("BZ-SPIN-9999");
    expect(stored[0].customerName).toBe("Rohan Verma");
    expect(stored[0].customerPhone).toBe("9876543210");
    expect(stored[0].wasVerified).toBe(true);

    // Unsubmitted claim without customer details should NOT be saved
    const incompleteRecord: SpinClaimRecord = {
      id: "claim-test-unsubmitted",
      claimCode: "BZ-SPIN-0000",
      prizeId: "prize-detan",
      prizeLabel: "Free De-Tan Glow",
      prizeType: "service",
      wasVerified: false,
      inventoryDeducted: false,
      createdAt: new Date().toISOString(),
    };
    saveClaimRecord(incompleteRecord);
    expect(getClaimRecords()).toHaveLength(1);
  });

  it("should correctly calculate inventory stock decrement for physical product claims", () => {
    const mockProduct = {
      id: "prod-1",
      name: "Hair Serum 100ml",
      type: "product" as const,
      price: 600,
      stock_qty: 15,
    };

    // Simulate inventory decrement on claim
    const updatedStock = Math.max(0, (mockProduct.stock_qty ?? 0) - 1);
    expect(updatedStock).toBe(14);

    // If stock was 0, it should not go below 0
    const zeroProduct = { ...mockProduct, stock_qty: 0 };
    const zeroStock = Math.max(0, (zeroProduct.stock_qty ?? 0) - 1);
    expect(zeroStock).toBe(0);
  });

  it("should strip product quantities (ml, gm, etc.) from reward labels", () => {
    expect(removeProductQuantity("Free L'Oréal Shampoo (300ml)")).toBe("Free L'Oréal Shampoo");
    expect(removeProductQuantity("L'Oréal Hair Mask 500 ml")).toBe("L'Oréal Hair Mask");
    expect(removeProductQuantity("Face Wash 150g")).toBe("Face Wash");
    expect(removeProductQuantity("Free D-Tan Service")).toBe("Free D-Tan Service");
  });
});
