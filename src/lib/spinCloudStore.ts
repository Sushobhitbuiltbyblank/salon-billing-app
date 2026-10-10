import fs from "fs/promises";
import path from "path";
import os from "os";
import { SpinClaimRecord, WheelInventoryItem, DEFAULT_WHEEL_INVENTORY } from "@/types/rewards";
import { cleanPhoneNumber } from "@/lib/whatsapp";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export const SYSTEM_SPIN_DATA_ID = "00000000-0000-0000-0000-000000000099";
export const SYSTEM_SPIN_NAME = "__SYSTEM_SPIN_DATA__";
export const SYSTEM_SPIN_PHONE = "0000000000";

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const TMP_DATA_DIR = path.join(os.tmpdir(), "belezia_spin_data");

const LOCAL_CLAIMS_FILE = path.join(LOCAL_DATA_DIR, "spin_claims.json");
const TMP_CLAIMS_FILE = path.join(TMP_DATA_DIR, "spin_claims.json");

const LOCAL_INVENTORY_FILE = path.join(LOCAL_DATA_DIR, "wheel_inventory.json");
const TMP_INVENTORY_FILE = path.join(TMP_DATA_DIR, "wheel_inventory.json");

/**
 * Filter out facewash variants and deduplicate inventory items
 */
export function sanitizeWheelInventory(items: WheelInventoryItem[]): WheelInventoryItem[] {
  if (!Array.isArray(items) || items.length === 0) return DEFAULT_WHEEL_INVENTORY;
  const filtered = items.filter((item) => {
    if (!item || !item.id || !item.title?.trim()) return false;
    if (
      item.id === "00000000-0000-0000-0000-000000000202" ||
      item.id === "prize-loreal-facewash" ||
      item.id.includes("facewash")
    ) {
      return false;
    }
    const clean = item.title.toLowerCase().replace(/[\s\-_]/g, "");
    if (clean.includes("facewash") || clean.includes("facecleaner")) {
      return false;
    }
    return true;
  });

  const seen = new Set<string>();
  const deduped: WheelInventoryItem[] = [];
  for (const it of filtered) {
    if (!seen.has(it.id)) {
      seen.add(it.id);
      deduped.push(it);
    }
  }
  return deduped.length > 0 ? deduped : DEFAULT_WHEEL_INVENTORY;
}

/**
 * Filter only valid claims with non-empty customer name and phone
 */
export function sanitizeClaims(claims: any[]): SpinClaimRecord[] {
  if (!Array.isArray(claims)) return [];
  const valid = claims.filter(
    (c) =>
      c &&
      typeof c === "object" &&
      Boolean(c.customerName && String(c.customerName).trim()) &&
      Boolean(c.customerPhone && String(c.customerPhone).trim()) &&
      Boolean(c.claimCode && String(c.claimCode).trim())
  );

  const seenCodes = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: SpinClaimRecord[] = [];

  for (const c of valid) {
    const idKey = String(c.id || "").trim();
    const codeKey = String(c.claimCode || "").trim().toLowerCase();
    if (idKey && seenIds.has(idKey)) continue;
    if (codeKey && seenCodes.has(codeKey)) continue;
    if (idKey) seenIds.add(idKey);
    if (codeKey) seenCodes.add(codeKey);
    deduped.push(c as SpinClaimRecord);
  }

  return deduped;
}

// Write to disk safely with fallback to /tmp on serverless environments
async function safeWriteJson(primaryPath: string, tmpPath: string, data: any): Promise<void> {
  const jsonStr = JSON.stringify(data, null, 2);
  let written = false;

  try {
    const dir = path.dirname(primaryPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(primaryPath, jsonStr, "utf-8");
    written = true;
  } catch {
    // Primary path is read-only on Vercel lambda
  }

  try {
    const tmpDir = path.dirname(tmpPath);
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(tmpPath, jsonStr, "utf-8");
    written = true;
  } catch {
    // /tmp write fallback
  }
}

// Read from disk or /tmp safely
async function safeReadJson(primaryPath: string, tmpPath: string): Promise<any | null> {
  // Check /tmp first as it might have latest serverless changes
  try {
    const content = await fs.readFile(tmpPath, "utf-8");
    return JSON.parse(content);
  } catch {}

  try {
    const content = await fs.readFile(primaryPath, "utf-8");
    return JSON.parse(content);
  } catch {}

  return null;
}

/**
 * Load the Supabase System Record notes JSON containing { claims, wheel_inventory }
 */
async function getSupabaseSystemData(): Promise<{
  claims: SpinClaimRecord[];
  wheel_inventory: WheelInventoryItem[];
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { claims: [], wheel_inventory: [] };
  }

  try {
    const { data, error } = await supabase
      .from("customers")
      .select("notes")
      .eq("id", SYSTEM_SPIN_DATA_ID)
      .maybeSingle();

    if (!error && data?.notes) {
      try {
        const parsed = JSON.parse(data.notes);
        return {
          claims: sanitizeClaims(parsed.claims || []),
          wheel_inventory: sanitizeWheelInventory(parsed.wheel_inventory || []),
        };
      } catch {}
    }
  } catch (err) {
    console.warn("Error reading Supabase system spin data:", err);
  }

  return { claims: [], wheel_inventory: [] };
}

/**
 * Save the Supabase System Record notes JSON containing { claims, wheel_inventory }
 */
async function saveSupabaseSystemData(payload: {
  claims?: SpinClaimRecord[];
  wheel_inventory?: WheelInventoryItem[];
}): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    const current = await getSupabaseSystemData();
    const claimsToSave = payload.claims !== undefined ? sanitizeClaims(payload.claims) : current.claims;
    const inventoryToSave =
      payload.wheel_inventory !== undefined
        ? sanitizeWheelInventory(payload.wheel_inventory)
        : current.wheel_inventory;

    const notesStr = JSON.stringify({
      claims: claimsToSave,
      wheel_inventory: inventoryToSave,
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase.from("customers").upsert(
      {
        id: SYSTEM_SPIN_DATA_ID,
        name: SYSTEM_SPIN_NAME,
        phone: SYSTEM_SPIN_PHONE,
        notes: notesStr,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("Failed to upsert Supabase system spin data:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exception saving Supabase system spin data:", err);
    return false;
  }
}

// -------------------------------------------------------------
// PUBLIC METHODS FOR SPIN CLAIMS
// -------------------------------------------------------------

/**
 * Load all spin claims from cloud (Supabase), falling back to disk cache if cloud is unavailable.
 */
export async function loadCloudClaims(): Promise<SpinClaimRecord[]> {
  // 1. Try Supabase system record
  const systemData = await getSupabaseSystemData();
  let cloudClaims = systemData.claims;

  // 2. Also try local disk / tmp cache
  const diskData = await safeReadJson(LOCAL_CLAIMS_FILE, TMP_CLAIMS_FILE);
  const diskClaims = sanitizeClaims(Array.isArray(diskData) ? diskData : []);

  // Merge and deduplicate (cloud is preferred, but include any disk claims not in cloud)
  const combinedMap = new Map<string, SpinClaimRecord>();
  for (const c of diskClaims) {
    if (c.claimCode) combinedMap.set(c.claimCode.toLowerCase(), c);
  }
  for (const c of cloudClaims) {
    if (c.claimCode) combinedMap.set(c.claimCode.toLowerCase(), c);
  }

  const allClaims = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // If cloud was missing claims that were on disk, sync them back up to cloud
  if (cloudClaims.length < allClaims.length && isSupabaseConfigured()) {
    saveSupabaseSystemData({ claims: allClaims }).catch(() => {});
  }

  // Update local disk cache
  safeWriteJson(LOCAL_CLAIMS_FILE, TMP_CLAIMS_FILE, allClaims).catch(() => {});

  return allClaims;
}

/**
 * Save full list of claims to cloud and cache
 */
export async function saveCloudClaims(claims: SpinClaimRecord[]): Promise<void> {
  const sanitized = sanitizeClaims(claims);
  await saveSupabaseSystemData({ claims: sanitized });
  await safeWriteJson(LOCAL_CLAIMS_FILE, TMP_CLAIMS_FILE, sanitized);
}

/**
 * Add a new claim record:
 * 1. Appends to central Supabase spin registry row
 * 2. Creates/updates customer row in Supabase customers table with their claim
 * 3. Updates local serverless cache
 */
export async function addCloudClaim(newClaim: SpinClaimRecord): Promise<SpinClaimRecord[]> {
  const currentClaims = await loadCloudClaims();
  const cleanPhone = cleanPhoneNumber(newClaim.customerPhone || "");
  const cleanName = (newClaim.customerName || "").trim();

  const updatedClaim: SpinClaimRecord = {
    ...newClaim,
    customerName: cleanName,
    customerPhone: cleanPhone,
  };

  const updatedList = [
    updatedClaim,
    ...currentClaims.filter(
      (c) =>
        c.id !== updatedClaim.id &&
        c.claimCode.trim().toLowerCase() !== updatedClaim.claimCode.trim().toLowerCase()
    ),
  ];

  // Save to central cloud registry and disk cache
  await saveCloudClaims(updatedList);

  // Also upsert/attach to customer profile in Supabase customers table
  if (isSupabaseConfigured() && supabase && cleanPhone && cleanPhone.length === 10) {
    try {
      const { data: existingCust } = await supabase
        .from("customers")
        .select("id, name, notes")
        .eq("phone", cleanPhone)
        .maybeSingle();

      let notesObj: any = {};
      if (existingCust?.notes && typeof existingCust.notes === "string" && existingCust.notes.startsWith("{")) {
        try {
          notesObj = JSON.parse(existingCust.notes);
        } catch {}
      }

      const pastClaims: SpinClaimRecord[] = Array.isArray(notesObj.spin_claims) ? notesObj.spin_claims : [];
      const updatedCustClaims = [
        updatedClaim,
        ...pastClaims.filter((c) => c.claimCode !== updatedClaim.claimCode),
      ];

      notesObj.spin_claim = updatedClaim;
      notesObj.spin_claims = updatedCustClaims;
      notesObj.updated_at = new Date().toISOString();

      await supabase.from("customers").upsert(
        {
          id: existingCust?.id || undefined,
          name: existingCust?.name || cleanName || `Guest (${cleanPhone})`,
          phone: cleanPhone,
          notes: JSON.stringify(notesObj),
          last_visit: new Date().toISOString(),
        },
        { onConflict: "phone" }
      );
    } catch (err) {
      console.warn("Failed to attach spin claim to customer row in Supabase:", err);
    }
  }

  return updatedList;
}

/**
 * Delete a claim by ID, claim code, phone number, or clear all claims
 */
export async function deleteCloudClaim(options: {
  id?: string | null;
  code?: string | null;
  phone?: string | null;
  clearAll?: boolean;
}): Promise<SpinClaimRecord[]> {
  if (options.clearAll) {
    await saveCloudClaims([]);

    // Clear spin_claim from all customer profiles in Supabase as well
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: custs } = await supabase
          .from("customers")
          .select("id, notes")
          .ilike("notes", "%spin_claim%");

        if (custs && custs.length > 0) {
          for (const cust of custs) {
            if (cust.id === SYSTEM_SPIN_DATA_ID) continue;
            try {
              const parsed = JSON.parse(cust.notes);
              delete parsed.spin_claim;
              delete parsed.spin_claims;
              await supabase
                .from("customers")
                .update({ notes: JSON.stringify(parsed) })
                .eq("id", cust.id);
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Error cleaning customer spin claims on clearAll:", err);
      }
    }

    return [];
  }

  const current = await loadCloudClaims();
  const cleanPhone = options.phone ? cleanPhoneNumber(options.phone) : null;
  const cleanCode = options.code ? options.code.trim().toLowerCase() : null;

  let phoneToClean = cleanPhone;

  const filtered = current.filter((c) => {
    const matchesId = Boolean(options.id && c.id === options.id);
    const matchesCode = Boolean(cleanCode && c.claimCode.trim().toLowerCase() === cleanCode);
    const matchesPhone = Boolean(cleanPhone && c.customerPhone && cleanPhoneNumber(c.customerPhone) === cleanPhone);

    if (matchesId || matchesCode || matchesPhone) {
      if (!phoneToClean && c.customerPhone) {
        phoneToClean = cleanPhoneNumber(c.customerPhone);
      }
      return false; // remove from list
    }
    return true;
  });

  await saveCloudClaims(filtered);

  // If deleting for a customer with phone, also remove spin_claim from their customer profile
  if (isSupabaseConfigured() && supabase && phoneToClean) {
    try {
      const { data: cust } = await supabase
        .from("customers")
        .select("id, notes")
        .eq("phone", phoneToClean)
        .maybeSingle();

      if (cust?.notes && cust.notes.startsWith("{")) {
        try {
          const parsed = JSON.parse(cust.notes);
          delete parsed.spin_claim;
          delete parsed.spin_claims;
          await supabase
            .from("customers")
            .update({ notes: JSON.stringify(parsed) })
            .eq("id", cust.id);
        } catch {}
      }
    } catch {}
  }

  return filtered;
}

// -------------------------------------------------------------
// PUBLIC METHODS FOR WHEEL INVENTORY
// -------------------------------------------------------------

/**
 * Load wheel pool stock inventory from cloud, falling back to disk cache or default inventory
 */
export async function loadCloudWheelInventory(): Promise<WheelInventoryItem[]> {
  const systemData = await getSupabaseSystemData();
  if (systemData.wheel_inventory && systemData.wheel_inventory.length > 0) {
    safeWriteJson(LOCAL_INVENTORY_FILE, TMP_INVENTORY_FILE, systemData.wheel_inventory).catch(() => {});
    return systemData.wheel_inventory;
  }

  const diskData = await safeReadJson(LOCAL_INVENTORY_FILE, TMP_INVENTORY_FILE);
  if (Array.isArray(diskData) && diskData.length > 0) {
    const clean = sanitizeWheelInventory(diskData);
    if (isSupabaseConfigured()) {
      saveSupabaseSystemData({ wheel_inventory: clean }).catch(() => {});
    }
    return clean;
  }

  const initial = sanitizeWheelInventory(DEFAULT_WHEEL_INVENTORY);
  if (isSupabaseConfigured()) {
    saveSupabaseSystemData({ wheel_inventory: initial }).catch(() => {});
  }
  safeWriteJson(LOCAL_INVENTORY_FILE, TMP_INVENTORY_FILE, initial).catch(() => {});
  return initial;
}

/**
 * Save wheel pool stock inventory to cloud and local cache
 */
export async function saveCloudWheelInventory(items: WheelInventoryItem[]): Promise<WheelInventoryItem[]> {
  const sanitized = sanitizeWheelInventory(items);
  await saveSupabaseSystemData({ wheel_inventory: sanitized });
  await safeWriteJson(LOCAL_INVENTORY_FILE, TMP_INVENTORY_FILE, sanitized);
  return sanitized;
}
