import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_KANPEKI_CONFIG,
  DEFAULT_KANPEKI_INVENTORY,
  BRAND_PRESETS,
  WheelInventoryItem,
  SpinClaimRecord,
  getPrizeWeight,
  pickWeightedPrizeIndex,
} from "@/types/rewards";
import { Storage } from "@/lib/storage";

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

describe("Lucky Wheel Brand Configuration & Live Inventory Decrement (Kanpeki)", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("should have correct Kanpeki default brand configuration and BZ-KANPEKI- prefix", () => {
    expect(DEFAULT_KANPEKI_CONFIG.brandName).toBe("Kanpeki");
    expect(DEFAULT_KANPEKI_CONFIG.offerPrefix).toBe("BZ-KANPEKI-");
    expect(DEFAULT_KANPEKI_CONFIG.isSpinActive).toBe(true);
    expect(DEFAULT_KANPEKI_CONFIG.eventName).toContain("Kanpeki");
    expect(DEFAULT_KANPEKI_CONFIG.disclaimerTerms).toContain("First-Come, First-Served");
    expect(DEFAULT_KANPEKI_CONFIG.eventDate).toBe("Saturday, December 5, 2026");
  });

  it("should have 4 curated reward items with exact specified probability weights and 30 initial stock each", () => {
    expect(DEFAULT_KANPEKI_INVENTORY).toHaveLength(4);

    const totalInitialStock = DEFAULT_KANPEKI_INVENTORY.reduce(
      (acc, item) => acc + item.quantity,
      0
    );
    expect(totalInitialStock).toBe(120);

    // • Detan: 50% chance (weight: 50)
    const detan = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title.toLowerCase().includes("detan"));
    expect(detan).toBeDefined();
    expect(detan?.quantity).toBe(30);
    expect(detan?.weight).toBe(50);
    expect(getPrizeWeight(detan!)).toBe(50);

    // • Hair cut: 16.67% chance (weight: 16.67)
    const hairCut = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title.toLowerCase().includes("hair cut"));
    expect(hairCut).toBeDefined();
    expect(hairCut?.quantity).toBe(30);
    expect(hairCut?.weight).toBe(16.67);
    expect(getPrizeWeight(hairCut!)).toBe(16.67);

    // • Shaving / face threading: 16.67% chance (weight: 16.67)
    const shaving = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title.toLowerCase().includes("shaving"));
    expect(shaving).toBeDefined();
    expect(shaving?.quantity).toBe(30);
    expect(shaving?.weight).toBe(16.67);
    expect(getPrizeWeight(shaving!)).toBe(16.67);

    // • Head wash: 16.66% chance (weight: 16.66)
    const headWash = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title.toLowerCase().includes("head wash"));
    expect(headWash).toBeDefined();
    expect(headWash?.quantity).toBe(30);
    expect(headWash?.weight).toBe(16.66);
    expect(getPrizeWeight(headWash!)).toBe(16.66);

    // Total probability weight = 100.00%
    const sumWeights =
      (detan?.weight ?? 0) +
      (hairCut?.weight ?? 0) +
      (shaving?.weight ?? 0) +
      (headWash?.weight ?? 0);
    expect(Number(sumWeights.toFixed(2))).toBe(100);
  });

  it("should support one-click brand presets including Kanpeki and L'Oréal", () => {
    expect(BRAND_PRESETS.length).toBeGreaterThanOrEqual(2);

    const kanpekiPreset = BRAND_PRESETS.find((p) => p.id === "kanpeki");
    expect(kanpekiPreset).toBeDefined();
    expect(kanpekiPreset?.config.brandName).toBe("Kanpeki");

    const lorealPreset = BRAND_PRESETS.find((p) => p.id === "loreal");
    expect(lorealPreset).toBeDefined();
    expect(lorealPreset?.config.brandName).toBe("L'Oréal Professionnel");
  });

  it("should decrement inventory stock from 30 to 29 when an offer is provided to a customer", () => {
    // 1. Initialize storage with Kanpeki inventory (30 stock each)
    Storage.saveWheelInventory(DEFAULT_KANPEKI_INVENTORY);
    const initialList = Storage.getWheelInventory();
    const detanItem = initialList.find((i) => i.title.toLowerCase().includes("detan"));
    expect(detanItem?.quantity).toBe(30);

    // 2. Customer claims "Free Detan Service" -> Stock decrements
    const updated = Storage.decrementWheelInventoryStock(detanItem!.id);
    expect(updated).toBeDefined();
    expect(updated?.quantity).toBe(29); // 30 -> 29 remaining!

    // 3. Verify persisted storage has 29
    const reloaded = Storage.getWheelInventory();
    const reloadedDetan = reloaded.find((i) => i.id === detanItem!.id);
    expect(reloadedDetan?.quantity).toBe(29);

    // Other items must remain untouched at 30
    const hairCut = reloaded.find((i) => i.title.toLowerCase().includes("hair cut"));
    expect(hairCut?.quantity).toBe(30);
  });

  it("should decrement further to 28 on next customer claim", () => {
    Storage.saveWheelInventory(DEFAULT_KANPEKI_INVENTORY);
    const detanId = DEFAULT_KANPEKI_INVENTORY[0].id;

    // First claim: 30 -> 29
    Storage.decrementWheelInventoryStock(detanId);
    // Second claim: 29 -> 28
    const secondClaim = Storage.decrementWheelInventoryStock(detanId);
    expect(secondClaim?.quantity).toBe(28);

    const list = Storage.getWheelInventory();
    const item = list.find((i) => i.id === detanId);
    expect(item?.quantity).toBe(28);
  });
});

describe("Spin The Wheel Probability Engine (Weighted Selection Logic)", () => {
  it("should return correct weights based on title pattern matching fallback when weight property is omitted", () => {
    expect(getPrizeWeight({ title: "Detan Service" })).toBe(50);
    expect(getPrizeWeight({ title: "Free D-Tan Brightening" })).toBe(50);
    expect(getPrizeWeight({ title: "Free Hair Cut" })).toBe(16.67);
    expect(getPrizeWeight({ title: "Shaving / Face Threading" })).toBe(16.67);
    expect(getPrizeWeight({ title: "Free Head Wash" })).toBe(16.66);
  });

  it("should assign 0 weight to items that are out of stock (quantity <= 0) or inactive", () => {
    expect(getPrizeWeight({ title: "Free Detan Service", quantity: 0 })).toBe(0);
    expect(getPrizeWeight({ title: "Free Detan Service", quantity: -1 })).toBe(0);
    expect(getPrizeWeight({ title: "Free Detan Service", is_active: false })).toBe(0);
  });

  it("should accurately pre-calculate winners matching exact probabilities via Monte Carlo simulation", () => {
    const items = [
      { id: "1", title: "Free Detan Service", weight: 50, quantity: 30, is_active: true },
      { id: "2", title: "Free Hair Cut", weight: 16.67, quantity: 30, is_active: true },
      { id: "3", title: "Free Shaving / Face Threading", weight: 16.67, quantity: 30, is_active: true },
      { id: "4", title: "Free Head Wash", weight: 16.66, quantity: 30, is_active: true },
    ];

    const iterations = 30000;
    const counts = [0, 0, 0, 0];

    for (let i = 0; i < iterations; i++) {
      const idx = pickWeightedPrizeIndex(items);
      counts[idx]++;
    }

    const detanPct = (counts[0] / iterations) * 100;
    const hairCutPct = (counts[1] / iterations) * 100;
    const shavingPct = (counts[2] / iterations) * 100;
    const headWashPct = (counts[3] / iterations) * 100;

    // Detan target: 50% (allow tolerance +/- 1.5% over 30,000 runs)
    expect(detanPct).toBeGreaterThan(48.5);
    expect(detanPct).toBeLessThan(51.5);

    // Hair cut target: 16.67% (allow tolerance +/- 1.2%)
    expect(hairCutPct).toBeGreaterThan(15.47);
    expect(hairCutPct).toBeLessThan(17.87);

    // Shaving / Face Threading target: 16.67% (allow tolerance +/- 1.2%)
    expect(shavingPct).toBeGreaterThan(15.47);
    expect(shavingPct).toBeLessThan(17.87);

    // Head Wash target: 16.66% (allow tolerance +/- 1.2%)
    expect(headWashPct).toBeGreaterThan(15.46);
    expect(headWashPct).toBeLessThan(17.86);
  });

  it("should never select an out-of-stock item when its quantity reaches 0", () => {
    const itemsWithDetanDepleted = [
      { id: "1", title: "Free Detan Service", weight: 50, quantity: 0, is_active: true }, // OUT OF STOCK
      { id: "2", title: "Free Hair Cut", weight: 16.67, quantity: 30, is_active: true },
      { id: "3", title: "Free Shaving / Face Threading", weight: 16.67, quantity: 30, is_active: true },
      { id: "4", title: "Free Head Wash", weight: 16.66, quantity: 30, is_active: true },
    ];

    for (let i = 0; i < 1000; i++) {
      const idx = pickWeightedPrizeIndex(itemsWithDetanDepleted);
      expect(idx).not.toBe(0); // Detan must never be selected
    }
  });

  it("should select the sole remaining in-stock prize 100% of the time", () => {
    const itemsWithOnlyHairCut = [
      { id: "1", title: "Free Detan Service", weight: 50, quantity: 0, is_active: true },
      { id: "2", title: "Free Hair Cut", weight: 16.67, quantity: 5, is_active: true },
      { id: "3", title: "Free Shaving / Face Threading", weight: 16.67, quantity: 0, is_active: true },
      { id: "4", title: "Free Head Wash", weight: 16.66, quantity: 0, is_active: true },
    ];

    for (let i = 0; i < 100; i++) {
      const idx = pickWeightedPrizeIndex(itemsWithOnlyHairCut);
      expect(idx).toBe(1); // Hair Cut
    }
  });
});
