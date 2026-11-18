import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_KANPEKI_CONFIG,
  DEFAULT_KANPEKI_INVENTORY,
  BRAND_PRESETS,
  WheelInventoryItem,
  SpinClaimRecord,
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
  });

  it("should have 4 Kanpeki curated reward items with 30 initial stock each (120 total units)", () => {
    expect(DEFAULT_KANPEKI_INVENTORY).toHaveLength(4);

    const totalInitialStock = DEFAULT_KANPEKI_INVENTORY.reduce(
      (acc, item) => acc + item.quantity,
      0
    );
    expect(totalInitialStock).toBe(120);

    const facial = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title === "Free Kanpeki Skin Facial");
    expect(facial).toBeDefined();
    expect(facial?.quantity).toBe(30);

    const hairSpa = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title === "Free Kanpeki Hair Spa Ritual");
    expect(hairSpa).toBeDefined();
    expect(hairSpa?.quantity).toBe(30);

    const gift = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title === "Free Kanpeki Professional Gift");
    expect(gift).toBeDefined();
    expect(gift?.quantity).toBe(30);

    const dtan = DEFAULT_KANPEKI_INVENTORY.find((i) => i.title === "Free D-Tan Brightening Service");
    expect(dtan).toBeDefined();
    expect(dtan?.quantity).toBe(30);
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
    const facialItem = initialList.find((i) => i.title === "Free Kanpeki Skin Facial");
    expect(facialItem?.quantity).toBe(30);

    // 2. Customer claims "Free Kanpeki Skin Facial" -> Stock decrements
    const updated = Storage.decrementWheelInventoryStock(facialItem!.id);
    expect(updated).toBeDefined();
    expect(updated?.quantity).toBe(29); // 30 -> 29 remaining!

    // 3. Verify persisted storage has 29
    const reloaded = Storage.getWheelInventory();
    const reloadedFacial = reloaded.find((i) => i.id === facialItem!.id);
    expect(reloadedFacial?.quantity).toBe(29);

    // Other items must remain untouched at 30
    const hairSpa = reloaded.find((i) => i.title === "Free Kanpeki Hair Spa Ritual");
    expect(hairSpa?.quantity).toBe(30);
  });

  it("should decrement further to 28 on next customer claim", () => {
    Storage.saveWheelInventory(DEFAULT_KANPEKI_INVENTORY);
    const facialId = DEFAULT_KANPEKI_INVENTORY[0].id;

    // First claim: 30 -> 29
    Storage.decrementWheelInventoryStock(facialId);
    // Second claim: 29 -> 28
    const secondClaim = Storage.decrementWheelInventoryStock(facialId);
    expect(secondClaim?.quantity).toBe(28);

    const list = Storage.getWheelInventory();
    const item = list.find((i) => i.id === facialId);
    expect(item?.quantity).toBe(28);
  });
});
