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

  it("should contain the 4 core L'Oréal Day wheel items with 30 initial stock each", () => {
    expect(DEFAULT_WHEEL_INVENTORY).toHaveLength(4);

    const shampoo = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "Free L'Oréal Shampoo");
    expect(shampoo).toBeDefined();
    expect(shampoo?.quantity).toBe(30);
    expect(shampoo?.category).toBe("gift");

    const dtan = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "Free D-Tan Service");
    expect(dtan).toBeDefined();
    expect(dtan?.quantity).toBe(30);
    expect(dtan?.category).toBe("free_service");

    const hairCut = DEFAULT_WHEEL_INVENTORY.find((i) => i.title === "Free Hair Cut Service");
    expect(hairCut).toBeDefined();
    expect(hairCut?.quantity).toBe(30);
    expect(hairCut?.category).toBe("free_service");

    const hairMask = DEFAULT_WHEEL_INVENTORY.find(
      (i) => i.title === "Free L'Oréal absolute repair hair mask"
    );
    expect(hairMask).toBeDefined();
    expect(hairMask?.quantity).toBe(30);
    expect(hairMask?.category).toBe("gift");
  });

  it("should correctly persist, load, and decrement wheel inventory items in storage", () => {
    // Initial fetch should return default 4 items
    const initial = Storage.getWheelInventory();
    expect(initial).toHaveLength(4);

    // Decrement "Free L'Oréal Shampoo" (initial: 30)
    const shampooId = "00000000-0000-0000-0000-000000000201";
    const updated = Storage.decrementWheelInventoryStock(shampooId);
    expect(updated).toBeDefined();
    expect(updated?.quantity).toBe(29);

    // Verify stored inventory has updated count
    const reloaded = Storage.getWheelInventory();
    const found = reloaded.find((i) => i.id === shampooId);
    expect(found?.quantity).toBe(29);
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

  it("should delete an item and never allow legacy facewash variants into inventory", () => {
    // 1. Delete an item by ID
    const shampooId = "00000000-0000-0000-0000-000000000201";
    Storage.deleteWheelInventoryItem(shampooId);
    const afterDelete = Storage.getWheelInventory();
    expect(afterDelete.some((i) => i.id === shampooId)).toBe(false);

    // 2. Reject saving facewash variant
    const facewashVariant: WheelInventoryItem = {
      id: "00000000-0000-0000-0000-000000000202",
      title: "Free L'Oréal Face Wash",
      category: "gift",
      quantity: 30,
      is_active: true,
    };
    Storage.saveWheelInventoryItem(facewashVariant);

    const rechecked = Storage.getWheelInventory();
    expect(rechecked.some((i) => i.title.toLowerCase().includes("wash"))).toBe(false);
  });
});
