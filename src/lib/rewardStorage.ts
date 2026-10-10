import { SpinClaimRecord, RewardPrize, DEFAULT_PRIZES } from "@/types/rewards";

const CLAIMS_STORAGE_KEY = "belezia_spin_claims_v1";
const PRIZES_STORAGE_KEY = "belezia_spin_prizes_v1";

export function generateClaimCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BZ-SPIN-${num}`;
}

export function getOfferProductImage(title: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("shampoo")) return "/images/products/loreal-shampoo.jpg";
  if (t.includes("facewash")) return "/images/products/loreal-facewash.jpg";
  if (t.includes("d-tan") || t.includes("de-tan")) return "/images/products/dtan-service.jpg";
  if (t.includes("hair cut") || t.includes("haircut")) return "/images/products/haircut-service.jpg";
  if (t.includes("mask") || t.includes("repair")) return "/images/products/loreal-mask.jpg";
  return "/images/products/loreal-shampoo.jpg";
}

export function getActivePrizes(): RewardPrize[] {
  if (typeof window === "undefined") return DEFAULT_PRIZES;
  try {
    const raw = localStorage.getItem(PRIZES_STORAGE_KEY);
    if (!raw) return DEFAULT_PRIZES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRIZES;
  } catch (err) {
    console.error("Failed to load active spin prizes:", err);
    return DEFAULT_PRIZES;
  }
}

export function saveActivePrizes(prizes: RewardPrize[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(prizes));
  } catch (err) {
    console.error("Failed to save active spin prizes:", err);
  }
}

export function resetActivePrizes(): RewardPrize[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PRIZES_STORAGE_KEY);
  }
  return DEFAULT_PRIZES;
}

import { cleanPhoneNumber } from "./whatsapp";

export function getClaimRecords(): SpinClaimRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: SpinClaimRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Only return claims that have both customer name and phone number
    return parsed.filter(
      (c) => Boolean(c.customerName && c.customerName.trim() && c.customerPhone && c.customerPhone.trim())
    );
  } catch (err) {
    console.error("Failed to load spin claim records:", err);
    return [];
  }
}

function getApiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export async function syncClaimToServer(record: SpinClaimRecord): Promise<boolean> {
  if (typeof window === "undefined" || !window.location?.origin) return false;
  // NEVER sync or create claims that lack customer name or phone
  if (!record.customerName || !record.customerName.trim() || !record.customerPhone) {
    return false;
  }
  try {
    const res = await fetch(getApiUrl("/api/spin-claims"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.warn("Failed to sync spin claim to server:", err);
    return false;
  }
}

export interface PaginatedClaimsResponse {
  claims: SpinClaimRecord[];
  total: number;
  totalClaims: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export async function fetchServerClaimsPaginated(
  page: number = 1,
  limit: number = 10,
  search: string = ""
): Promise<PaginatedClaimsResponse> {
  if (typeof window === "undefined" || !window.location?.origin) {
    return {
      claims: [],
      total: 0,
      totalClaims: 0,
      page,
      limit,
      totalPages: 1,
      hasMore: false,
    };
  }
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      _t: String(Date.now()),
    });
    if (search.trim()) {
      params.set("search", search.trim());
    }
    const res = await fetch(getApiUrl(`/api/spin-claims?${params.toString()}`), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      return {
        claims: [],
        total: 0,
        totalClaims: 0,
        page,
        limit,
        totalPages: 1,
        hasMore: false,
      };
    }
    const data = await res.json();
    return {
      claims: Array.isArray(data.claims) ? data.claims : [],
      total: data.total ?? (data.claims?.length || 0),
      totalClaims: data.totalClaims ?? (data.claims?.length || 0),
      page: data.page ?? page,
      limit: data.limit ?? limit,
      totalPages: data.totalPages ?? 1,
      hasMore: Boolean(data.hasMore),
    };
  } catch (err) {
    console.warn("Failed to fetch paginated claims:", err);
    return {
      claims: [],
      total: 0,
      totalClaims: 0,
      page,
      limit,
      totalPages: 1,
      hasMore: false,
    };
  }
}

export async function fetchServerClaimRecords(): Promise<SpinClaimRecord[]> {
  if (typeof window === "undefined" || !window.location?.origin) return [];
  try {
    const res = await fetch(getApiUrl(`/api/spin-claims?_t=${Date.now()}`), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.claims)) {
      // Only keep records that have both customer name and phone
      const serverClaims: SpinClaimRecord[] = data.claims.filter(
        (c: SpinClaimRecord) =>
          Boolean(c.customerName && c.customerName.trim() && c.customerPhone && c.customerPhone.trim())
      );
      // The central server is the source of truth!
      try {
        localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(serverClaims.slice(0, 100)));
        if (serverClaims.length === 0) {
          clearAllLocalSpinLogs();
          sessionStorage.removeItem("belezia_spin_won_state");
        }
      } catch {}
      return serverClaims;
    }
    return [];
  } catch (err) {
    console.warn("Failed to fetch spin claims from server:", err);
    return [];
  }
}

export async function deleteServerClaimRecord(
  idOrCode?: string,
  code?: string,
  phone?: string
): Promise<boolean> {
  if (typeof window === "undefined" || !window.location?.origin) return false;
  try {
    const params = new URLSearchParams();
    if (idOrCode) params.set("id", idOrCode);
    if (code) params.set("code", code);
    if (phone) params.set("phone", phone);
    const res = await fetch(getApiUrl(`/api/spin-claims?${params.toString()}`), {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.warn("Failed to delete spin claim from server:", err);
    return false;
  }
}

export async function clearAllServerClaimRecords(): Promise<boolean> {
  if (typeof window === "undefined" || !window.location?.origin) return false;
  try {
    const res = await fetch(getApiUrl("/api/spin-claims?all=true"), { method: "DELETE" });
    return res.ok;
  } catch (err) {
    console.warn("Failed to clear spin claims from server:", err);
    return false;
  }
}

export async function checkPhoneHasClaimedServer(
  phoneNumber: string
): Promise<{ checked: boolean; hasClaimed: boolean; claim?: SpinClaimRecord | null }> {
  if (!phoneNumber || typeof window === "undefined" || !window.location?.origin) {
    return { checked: false, hasClaimed: false, claim: null };
  }
  try {
    const clean = cleanPhoneNumber(phoneNumber);
    const res = await fetch(getApiUrl(`/api/spin-claims?phone=${encodeURIComponent(clean)}`), {
      cache: "no-store",
    });
    if (!res.ok) return { checked: false, hasClaimed: false, claim: null };
    const data = await res.json();
    return {
      checked: true,
      hasClaimed: Boolean(data.hasClaimed),
      claim: data.claim || null,
    };
  } catch {
    return { checked: false, hasClaimed: false, claim: null };
  }
}

export async function verifyOfferOnServer(offerId: string) {
  if (!offerId || typeof window === "undefined" || !window.location?.origin) return null;
  try {
    const res = await fetch(getApiUrl(`/api/spin-claims?verify=${encodeURIComponent(offerId.trim())}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function saveClaimRecord(record: SpinClaimRecord): void {
  if (typeof window === "undefined") return;
  // NEVER save or create claim records if customer has not provided name and phone
  if (!record.customerName || !record.customerName.trim() || !record.customerPhone || !record.customerPhone.trim()) {
    return;
  }
  try {
    const current = getClaimRecords();
    const updated = [record, ...current.filter((c) => c.id !== record.id)];
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (err) {
    console.error("Failed to save spin claim record:", err);
  }
  // Immediately sync to server
  syncClaimToServer(record).catch(() => {});
}

export function deleteClaimRecord(idOrCode: string, code?: string, phone?: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getClaimRecords();
    const cleanPhone = phone ? cleanPhoneNumber(phone) : cleanPhoneNumber(idOrCode);
    const updated = current.filter(
      (c) =>
        c.id !== idOrCode &&
        c.claimCode !== idOrCode &&
        (!code || c.claimCode !== code) &&
        (!cleanPhone || !c.customerPhone || cleanPhoneNumber(c.customerPhone) !== cleanPhone)
    );
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(updated));
    deleteLocalSpinLog(idOrCode);
    if (code) deleteLocalSpinLog(code);
    if (phone) deleteLocalSpinLog(phone);
    if (cleanPhone) deleteLocalSpinLog(cleanPhone);
  } catch (err) {
    console.error("Failed to delete claim record:", err);
  }
  deleteServerClaimRecord(idOrCode, code, phone).catch(() => {});
}

export function clearAllClaimRecords(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CLAIMS_STORAGE_KEY);
    clearAllLocalSpinLogs();
    sessionStorage.removeItem("belezia_spin_won_state");
  } catch (err) {
    console.error("Failed to clear claim records:", err);
  }
  clearAllServerClaimRecords().catch(() => {});
}

// -------------------------------------------------------------
// L'OREAL PROFESSIONAL DAY SPIN LOGS & ANTI-FRAUD STORAGE
import { SpinLog } from "@/types/rewards";

const SPIN_LOGS_STORAGE_KEY = "belezia_loreal_spin_logs_v1";

export function generateOfferToken(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BZ-LOREAL-${num}`;
}

export function getLocalSpinLogs(): SpinLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPIN_LOGS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load local spin logs:", err);
    return [];
  }
}

export function saveLocalSpinLog(log: SpinLog): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalSpinLogs();
    const updated = [log, ...current.filter((l) => l.id !== log.id)];
    localStorage.setItem(SPIN_LOGS_STORAGE_KEY, JSON.stringify(updated.slice(0, 500)));
  } catch (err) {
    console.error("Failed to save local spin log:", err);
  }
}

export function deleteLocalSpinLog(idOrTokenOrPhone: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalSpinLogs();
    const clean = idOrTokenOrPhone.trim().toLowerCase();
    const cleanPhone = cleanPhoneNumber(idOrTokenOrPhone);
    const updated = current.filter(
      (l) =>
        l.id.toLowerCase() !== clean &&
        (!l.offer_token || l.offer_token.trim().toLowerCase() !== clean) &&
        (!cleanPhone || !l.phone_number || cleanPhoneNumber(l.phone_number) !== cleanPhone)
    );
    localStorage.setItem(SPIN_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to delete local spin log:", err);
  }
}

export function clearAllLocalSpinLogs(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SPIN_LOGS_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear local spin logs:", err);
  }
}

export function isPhoneClaimedLocally(phoneNumber: string): boolean {
  const clean = cleanPhoneNumber(phoneNumber);
  if (!clean) return false;
  const logs = getLocalSpinLogs();
  return logs.some((l) => cleanPhoneNumber(l.phone_number) === clean && l.is_redeemed);
}

export function isTokenRedeemedLocally(token: string): boolean {
  if (!token) return false;
  const cleanToken = token.trim().toLowerCase();
  const logs = getLocalSpinLogs();
  return logs.some(
    (l) => l.offer_token && l.offer_token.trim().toLowerCase() === cleanToken && l.is_redeemed
  );
}

export function findLocalOfferById(offerId: string): SpinLog | null {
  if (!offerId || !offerId.trim()) return null;
  const q = offerId.trim().toLowerCase();
  const logs = getLocalSpinLogs();
  const foundLog = logs.find(
    (l) =>
      (l.offer_token && l.offer_token.trim().toLowerCase() === q) ||
      (l.id && l.id.toLowerCase() === q)
  );
  if (foundLog) return foundLog;

  // Also search claim records
  const claims = getClaimRecords();
  const foundClaim = claims.find(
    (c) => c.claimCode && c.claimCode.trim().toLowerCase() === q
  );
  if (foundClaim) {
    return {
      id: foundClaim.id,
      offer_token: foundClaim.claimCode,
      customer_name: foundClaim.customerName || "Customer",
      phone_number: foundClaim.customerPhone || "Not Provided",
      won_item: foundClaim.prizeLabel,
      prize_id: foundClaim.prizeId,
      is_redeemed: true,
      redeemed_at: foundClaim.createdAt,
      created_at: foundClaim.createdAt,
    };
  }
  return null;
}

