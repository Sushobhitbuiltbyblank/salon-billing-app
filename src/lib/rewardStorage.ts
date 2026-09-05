import { SpinClaimRecord, RewardPrize, DEFAULT_PRIZES } from "@/types/rewards";

const CLAIMS_STORAGE_KEY = "belezia_spin_claims_v1";
const PRIZES_STORAGE_KEY = "belezia_spin_prizes_v1";

export function generateClaimCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BZ-SPIN-${num}`;
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

export function getClaimRecords(): SpinClaimRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load spin claim records:", err);
    return [];
  }
}

export function saveClaimRecord(record: SpinClaimRecord): void {
  if (typeof window === "undefined") return;
  try {
    const current = getClaimRecords();
    const updated = [record, ...current.filter((c) => c.id !== record.id)];
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (err) {
    console.error("Failed to save spin claim record:", err);
  }
}

