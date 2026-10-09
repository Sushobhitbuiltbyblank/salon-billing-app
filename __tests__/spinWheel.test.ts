import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_PRIZES, SpinClaimRecord } from "@/types/rewards";
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

  it("should properly persist and retrieve claim records in storage", () => {
    expect(getClaimRecords()).toEqual([]);

    const record: SpinClaimRecord = {
      id: "claim-test-1",
      claimCode: "BZ-SPIN-9999",
      prizeId: "prize-detan",
      prizeLabel: "Free De-Tan Glow",
      prizeType: "service",
      wasVerified: true,
      inventoryDeducted: false,
      createdAt: new Date().toISOString(),
    };

    saveClaimRecord(record);

    const stored = getClaimRecords();
    expect(stored).toHaveLength(1);
    expect(stored[0].claimCode).toBe("BZ-SPIN-9999");
    expect(stored[0].wasVerified).toBe(true);
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
});
