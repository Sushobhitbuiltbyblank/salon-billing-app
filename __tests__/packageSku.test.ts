import { describe, it, expect } from "vitest";
import { encodePackageSku, decodePackageSku } from "@/lib/supabaseSync";
import { CatalogItem } from "@/types";

describe("Package SKU Encoding and Decoding", () => {
  const catalog: CatalogItem[] = [
    {
      id: "srv-1",
      name: "Hair Cut",
      category_id: "cat-1",
      price: 150,
      type: "service",
    },
    {
      id: "srv-2",
      name: "Shave",
      category_id: "cat-1",
      price: 100,
      type: "service",
    },
  ];

  it("encodes package service IDs and regular price into compact SKU", () => {
    const sku = encodePackageSku(["srv-1", "srv-2"], 300);
    expect(sku).toContain("P:300");
    expect(sku).toContain("srv1");
    expect(sku).toContain("srv2");
  });

  it("decodes package SKU accurately back into service IDs and price", () => {
    const sku = encodePackageSku(["srv-1", "srv-2"], 300);
    const decoded = decodePackageSku(sku, catalog, "Hair Cut + Shave", "cat-pkg");

    expect(decoded).not.toBeNull();
    expect(decoded?.package_service_ids).toEqual(["srv-1", "srv-2"]);
    expect(decoded?.package_regular_price).toBe(300);
  });

  it("handles legacy and fallback SKUs gracefully", () => {
    expect(decodePackageSku(null, catalog, "Test", "cat-1")).toBeNull();
    expect(decodePackageSku("SIMPLE_SKU_123", catalog, "Simple Item", "cat-1")).toBeNull();
  });
});
