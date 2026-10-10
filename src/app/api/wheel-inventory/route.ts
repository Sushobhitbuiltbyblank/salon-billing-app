import { NextResponse } from "next/server";
import { WheelInventoryItem, DEFAULT_WHEEL_INVENTORY } from "@/types/rewards";
import {
  loadCloudWheelInventory,
  saveCloudWheelInventory,
  sanitizeWheelInventory,
} from "@/lib/spinCloudStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function isFacewashItem(item: { id?: string; title?: string } | null | undefined): boolean {
  if (!item) return false;
  if (
    item.id === "00000000-0000-0000-0000-000000000202" ||
    item.id === "prize-loreal-facewash" ||
    item.id?.includes("facewash")
  ) {
    return true;
  }
  const clean = (item.title || "").toLowerCase().replace(/[\s\-_]/g, "");
  return clean.includes("facewash") || clean.includes("facecleaner");
}

// GET: Fetch current wheel pool stocks inventory (central source of truth across all devices)
export async function GET() {
  try {
    const items = await loadCloudWheelInventory();
    return NextResponse.json(
      { success: true, items, count: items.length },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("GET /api/wheel-inventory error:", err);
    return NextResponse.json(
      { success: false, items: DEFAULT_WHEEL_INVENTORY, count: DEFAULT_WHEEL_INVENTORY.length },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: Upsert a single item, or replace entire pool stock inventory
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Bulk replace (e.g. reset to default or batch update)
    if (Array.isArray(body.items)) {
      const sanitized = sanitizeWheelInventory(body.items);
      const saved = await saveCloudWheelInventory(sanitized);
      return NextResponse.json({ success: true, items: saved }, { headers: NO_CACHE_HEADERS });
    }

    // 2. Single item upsert
    if (body.item && typeof body.item === "object") {
      const target: WheelInventoryItem = body.item;
      if (isFacewashItem(target)) {
        // Reject saving facewash
        const current = await loadCloudWheelInventory();
        return NextResponse.json({ success: true, items: current }, { headers: NO_CACHE_HEADERS });
      }

      const current = await loadCloudWheelInventory();
      const idx = current.findIndex((i) => i.id === target.id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...target };
      } else {
        current.push(target);
      }

      const saved = await saveCloudWheelInventory(current);
      return NextResponse.json({ success: true, items: saved }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json(
      { success: false, error: "Invalid payload" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("POST /api/wheel-inventory error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE: Delete an item from pool stock inventory by ID or title
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const title = searchParams.get("title");

    let payloadId = id;
    if (!payloadId) {
      try {
        const body = await request.json();
        payloadId = body.id;
      } catch {}
    }

    const current = await loadCloudWheelInventory();
    const remaining = current.filter((it) => {
      if (payloadId && it.id === payloadId) return false;
      if (title && it.title.toLowerCase().trim() === title.toLowerCase().trim()) return false;
      if (isFacewashItem(it)) return false;
      return true;
    });

    const saved = await saveCloudWheelInventory(remaining);
    return NextResponse.json(
      { success: true, items: saved, remainingCount: saved.length },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("DELETE /api/wheel-inventory error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete item" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

