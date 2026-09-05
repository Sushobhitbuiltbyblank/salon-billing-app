import { SpinClaimRecord } from "@/types/rewards";

const CLAIMS_STORAGE_KEY = "belezia_spin_claims_v1";

export function generateClaimCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BZ-SPIN-${num}`;
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
