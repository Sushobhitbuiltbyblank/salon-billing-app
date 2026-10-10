import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { WheelInventoryItem, DEFAULT_WHEEL_INVENTORY } from "@/types/rewards";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

const DATA_DIR = path.join(process.cwd(), "data");
const INVENTORY_FILE = path.join(DATA_DIR, "wheel_inventory.json");

/**
 * Robust check to filter out any variant of facewash / cleanser or legacy ID
 */
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

/**
 * Filter out facewash and deduplicate items by id
 */
function sanitizeInventory(items: WheelInventoryItem[]): WheelInventoryItem[] {
  if (!Array.isArray(items)) return DEFAULT_WHEEL_INVENTORY;
  const filtered = items.filter((i) => !isFacewashItem(i) && Boolean(i.id && i.title?.trim()));
  const seenIds = new Set<string>();
  const deduped: WheelInventoryItem[] = [];
  for (const it of filtered) {
    if (!seenIds.has(it.id)) {
      seenIds.add(it.id);
      deduped.push(it);
    }
  }
  return deduped.length > 0 ? deduped : DEFAULT_WHEEL_INVENTORY;
}

// Helper to load inventory from server disk
async function loadInventoryFromFile(): Promise<WheelInventoryItem[]> {
  try {
    const content = await fs.readFile(INVENTORY_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return sanitizeInventory(parsed);
  } catch {
    // If file doesn't exist yet, initialize with default inventory
    await saveInventoryToFile(DEFAULT_WHEEL_INVENTORY);
    return DEFAULT_WHEEL_INVENTORY;
  }
}

// Helper to save inventory to server disk safely
async function saveInventoryToFile(items: WheelInventoryItem[]): Promise<void> {
  try {
    const clean = sanitizeInventory(items);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(INVENTORY_FILE, JSON.stringify(clean, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write wheel inventory to file:", err);
  }
}

// GET: Fetch current wheel pool stocks inventory (central source of truth across all devices)
export async function GET() {
  try {
    const items = await loadInventoryFromFile();
    return NextResponse.json({ success: true, items, count: items.length });
  } catch (err) {
    console.error("GET /api/wheel-inventory error:", err);
    return NextResponse.json(
      { success: false, items: DEFAULT_WHEEL_INVENTORY, count: DEFAULT_WHEEL_INVENTORY.length },
      { status: 500 }
    );
  }
}

// POST: Upsert a single item, or replace entire pool stock inventory
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Bulk replace (e.g. reset to default or batch update)
    if (Array.isArray(body.items)) {
      const sanitized = sanitizeInventory(body.items);
      await saveInventoryToFile(sanitized);

      // Best effort remote sync if Supabase table exists
      if (isSupabaseConfigured() && supabase) {
        try {
          for (const it of sanitized) {
            await supabase.from("wheel_inventory").upsert(it);
          }
        } catch {
          // ignore remote table schema errors
        }
      }

      return NextResponse.json({ success: true, items: sanitized });
    }

    // 2. Single item upsert
    if (body.item && typeof body.item === "object") {
      const target: WheelInventoryItem = body.item;
      if (isFacewashItem(target)) {
        // Reject saving facewash
        const current = await loadInventoryFromFile();
        return NextResponse.json({ success: true, items: current });
      }

      const current = await loadInventoryFromFile();
      const idx = current.findIndex((i) => i.id === target.id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...target };
      } else {
        current.push(target);
      }

      const sanitized = sanitizeInventory(current);
      await saveInventoryToFile(sanitized);

      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase.from("wheel_inventory").upsert(target);
        } catch {}
      }

      return NextResponse.json({ success: true, items: sanitized });
    }

    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/wheel-inventory error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
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

    const current = await loadInventoryFromFile();
    const remaining = current.filter((it) => {
      if (payloadId && it.id === payloadId) return false;
      if (title && it.title.toLowerCase().trim() === title.toLowerCase().trim()) return false;
      if (isFacewashItem(it)) return false;
      return true;
    });

    await saveInventoryToFile(remaining);

    // Also attempt delete in Supabase if configured
    if (isSupabaseConfigured() && supabase && payloadId) {
      try {
        await supabase.from("wheel_inventory").delete().eq("id", payloadId);
      } catch {}
    }

    return NextResponse.json({ success: true, items: remaining, remainingCount: remaining.length });
  } catch (err) {
    console.error("DELETE /api/wheel-inventory error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 });
  }
}
