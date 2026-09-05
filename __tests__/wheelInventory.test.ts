import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_WHEEL_INVENTORY, WheelInventoryItem } from "@/types/rewards";
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

describe("Spin-the-Wheel Dedicated Inventory Pool", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("should contain the 6 core wheel items with their exact specified initial stock quantities", () => {
    expect(DEFAULT_WHEEL_INVENTORY).toHaveLength(6);

    const vipGift = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "Win VIP Gift");
    expect(vipGift).toBeDefined();
    expect(vipGift?.quantity).toBe(10);
    expect(vipGift?.category).toBe("gift");

    const hairSpa = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "Free Hair Spa");
    expect(hairSpa).toBeDefined();
    expect(hairSpa?.quantity).toBe(30);
    expect(hairSpa?.category).toBe("free_service");

    const discount20 = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "20% Discount");
    expect(discount20).toBeDefined();
    expect(discount20?.quantity).toBe(5);
    expect(discount20?.category).toBe("discount_coupon");

    const rupeeOff = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "100 Rupee Off");
    expect(rupeeOff).toBeDefined();
    expect(rupeeOff?.quantity).toBe(15);
    expect(rupeeOff?.category).toBe("offer");

    const detan = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "Free De-Tan");
    expect(detan).toBeDefined();
    expect(detan?.quantity).toBe(10);
    expect(detan?.category).toBe("free_service");

    const discount40 = DEFAULT_WHEEL_INVENTORY.find(
      (i) => i.title === "40% Discount on Product Purchase of 1000"
    );
    expect(discount40).toBeDefined();
    expect(discount40?.quantity).toBe(10);
    expect(discount40?.category).toBe("offer");
  });

  it("should correctly persist, load, and decrement wheel inventory items in storage", () => {
    // Initial fetch should return default 6 items
    const initial = Storage.getWheelInventory();
    expect(initial).toHaveLength(6);

    // Decrement "Win VIP Gift" (initial: 10)
    const vipGiftId = "00000000-0000-0000-0000-000000000101";
    const updated = Storage.decrementWheelInventoryStock(vipGiftId);
    expect(updated).toBeDefined();
    expect(updated?.quantity).toBe(9);

    // Verify stored inventory has updated count
    const reloaded = Storage.getWheelInventory();
    const found = reloaded.find((i) => i.id === vipGiftId);
    expect(found?.quantity).toBe(9);
  });

  it("should never allow inventory quantity to decrement below zero", () => {
    const customItem: WheelInventoryItem = {
      id: "zero-item-01",
      title: "Limited Sample",
      category: "gift",
      quantity: 0,
      is_active: true,
    };

    Storage.saveWheelInventoryItem(customItem);
    const decremented = Storage.decrementWheelInventoryStock("zero-item-01");
    expect(decremented?.quantity).toBe(0);
  });

  it("should correctly identify items under the low stock threshold (< 3)", () => {
    const items: WheelInventoryItem[] = [
      { id: "1", title: "Item 1", category: "gift", quantity: 2, is_active: true },
      { id: "2", title: "Item 2", category: "offer", quantity: 0, is_active: true },
      { id: "3", title: "Item 3", category: "discount_coupon", quantity: 5, is_active: true },
    ];

    const lowStock = items.filter((i) => i.quantity < 3);
    expect(lowStock).toHaveLength(2);
    expect(lowStock.map((i) => i.id)).toEqual(["1", "2"]);
  });
});
