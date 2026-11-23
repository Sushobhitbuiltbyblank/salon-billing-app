export type SpinGameState =
  | "IDLE"
  | "SPINNING"
  | "WON_PENDING_VERIFICATION"
  | "VERIFIED_AND_REVEALED";

export type WheelItemCategory =
  | "gift"
  | "offer"
  | "discount_coupon"
  | "free_service";

export interface WheelInventoryItem {
  id: string; // UUID
  title: string;
  category: WheelItemCategory;
  quantity: number;
  is_active: boolean;
  color?: string;
  created_at?: string;
  weight?: number; // Probability weight (e.g. 50, 16.67)
}

export interface SpinBrandConfig {
  brandName: string;
  eventName: string;
  tagline: string;
  disclaimerTerms: string;
  eventDate: string;
  eventVenue: string;
  offerPrefix: string;
  isSpinActive: boolean;
  instagramUrl?: string;
  instagramHandle?: string;
  updatedAt?: string;
}

export const DEFAULT_KANPEKI_CONFIG: SpinBrandConfig = {
  brandName: "Kanpeki",
  eventName: "Kanpeki Japanese Skin & Hair Rituals Event",
  tagline: "Exclusive Japanese Skincare Consultations & Guaranteed Lucky Wheel Rewards",
  disclaimerTerms:
    "🚨 Disclaimer: This exclusive offer and free goodies are valid strictly on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!",
  eventDate: "Saturday, December 5, 2026",
  eventVenue: "Belezia Salon, Laxmi Nagar",
  offerPrefix: "BZ-KANPEKI-",
  isSpinActive: true,
  instagramUrl: "https://www.instagram.com/beleziasalonlaxminagar/",
  instagramHandle: "@beleziasalonlaxminagar",
};

export const DEFAULT_KANPEKI_INVENTORY: WheelInventoryItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    title: "Free Detan Service",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#10b981", // Emerald
    weight: 50, // 50% chance
  },
  {
    id: "00000000-0000-0000-0000-000000000302",
    title: "Free Hair Cut",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#ec4899", // Pink
    weight: 16.67, // 16.67% chance
  },
  {
    id: "00000000-0000-0000-0000-000000000303",
    title: "Free Shaving / Face Threading",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#3b82f6", // Blue
    weight: 16.67, // 16.67% chance
  },
  {
    id: "00000000-0000-0000-0000-000000000304",
    title: "Free Head Wash",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#8b5cf6", // Purple
    weight: 16.66, // 16.66% chance
  },
];

export const BRAND_PRESETS: {
  id: string;
  name: string;
  config: SpinBrandConfig;
  inventory: WheelInventoryItem[];
}[] = [
  {
    id: "kanpeki",
    name: "Kanpeki (Active)",
    config: DEFAULT_KANPEKI_CONFIG,
    inventory: DEFAULT_KANPEKI_INVENTORY,
  },
  {
    id: "loreal",
    name: "L'Oréal Professionnel",
    config: {
      brandName: "L'Oréal Professionnel",
      eventName: "L’Oréal Professionnel Hair Consultation Event",
      tagline: "Expert Hair Consultations & Lucky Wheel Giveaways",
      disclaimerTerms:
        "🚨 Disclaimer: This exclusive offer and free goodies are valid strictly on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!",
      eventDate: "Saturday, October 31, 2026",
      eventVenue: "Belezia Salon, Laxmi Nagar",
      offerPrefix: "BZ-LOREAL-",
      isSpinActive: true,
      instagramUrl: "https://www.instagram.com/beleziasalonlaxminagar/",
      instagramHandle: "@beleziasalonlaxminagar",
    },
    inventory: [
      {
        id: "00000000-0000-0000-0000-000000000201",
        title: "Free L'Oréal Shampoo",
        category: "gift",
        quantity: 30,
        is_active: true,
        color: "#3b82f6",
      },
      {
        id: "00000000-0000-0000-0000-000000000203",
        title: "Free D-Tan Service",
        category: "free_service",
        quantity: 30,
        is_active: true,
        color: "#8b5cf6",
      },
      {
        id: "00000000-0000-0000-0000-000000000204",
        title: "Free Hair Cut Service",
        category: "free_service",
        quantity: 30,
        is_active: true,
        color: "#ec4899",
      },
      {
        id: "00000000-0000-0000-0000-000000000205",
        title: "Free L'Oréal absolute repair hair mask",
        category: "gift",
        quantity: 30,
        is_active: true,
        color: "#10b981",
      },
    ],
  },
  {
    id: "generic",
    name: "Belezia Signature / Custom Brand",
    config: {
      brandName: "Belezia VIP",
      eventName: "Belezia Luxury Beauty & Lucky Wheel Day",
      tagline: "Exclusive Salon Pampering & Guaranteed Rewards",
      disclaimerTerms:
        "🚨 Disclaimer: Valid strictly during salon operating hours on a First-Come, First-Served basis, only till stocks last! Arrive early to claim your reward.",
      eventDate: "Upcoming Salon Event",
      eventVenue: "Belezia Salon, Laxmi Nagar",
      offerPrefix: "BZ-SPIN-",
      isSpinActive: true,
      instagramUrl: "https://www.instagram.com/beleziasalonlaxminagar/",
      instagramHandle: "@beleziasalonlaxminagar",
    },
    inventory: [
      {
        id: "00000000-0000-0000-0000-000000000401",
        title: "Free Luxury Hair Spa",
        category: "free_service",
        quantity: 30,
        is_active: true,
        color: "#8b5cf6",
      },
      {
        id: "00000000-0000-0000-0000-000000000402",
        title: "Free D-Tan Brightening",
        category: "free_service",
        quantity: 30,
        is_active: true,
        color: "#ec4899",
      },
      {
        id: "00000000-0000-0000-0000-000000000403",
        title: "Free Senior Stylist Hair Cut",
        category: "free_service",
        quantity: 30,
        is_active: true,
        color: "#3b82f6",
      },
      {
        id: "00000000-0000-0000-0000-000000000404",
        title: "Free Luxury Beauty Gift",
        category: "gift",
        quantity: 30,
        is_active: true,
        color: "#10b981",
      },
    ],
  },
];

export const DEFAULT_LOREAL_INVENTORY: WheelInventoryItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000201",
    title: "Free L'Oréal Shampoo",
    category: "gift",
    quantity: 30,
    is_active: true,
    color: "#3b82f6",
  },
  {
    id: "00000000-0000-0000-0000-000000000203",
    title: "Free D-Tan Service",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#8b5cf6",
  },
  {
    id: "00000000-0000-0000-0000-000000000204",
    title: "Free Hair Cut Service",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#ec4899",
  },
  {
    id: "00000000-0000-0000-0000-000000000205",
    title: "Free L'Oréal absolute repair hair mask",
    category: "gift",
    quantity: 30,
    is_active: true,
    color: "#10b981",
  },
];

export const DEFAULT_WHEEL_INVENTORY: WheelInventoryItem[] = DEFAULT_LOREAL_INVENTORY;

export type PrizeType =
  | "service"
  | "discount_percent"
  | "discount_flat"
  | "product_gift";

export interface RewardPrize {
  id: string;
  label: string;
  shortLabel: string;
  type: PrizeType;
  value: number; // e.g. 20 for 20% discount or 200 for ₹200
  color: string;
  textColor?: string;
  iconName: string;
  description: string;
  catalogItemId?: string; // Optional link to catalog item (product/service)
  requiresInventoryDeduction?: boolean;
  weight?: number; // Probability weight
  quantity?: number; // Current inventory quantity
}

export interface SpinClaimRecord {
  id: string;
  claimCode: string;
  prizeId: string;
  prizeLabel: string;
  prizeType: PrizeType;
  customerName?: string;
  customerPhone?: string;
  wasVerified: boolean;
  inventoryDeducted: boolean;
  catalogItemId?: string;
  createdAt: string;
}

export interface SpinLog {
  id: string;
  offer_token?: string;
  customer_name?: string;
  phone_number: string;
  won_item: string;
  prize_id?: string;
  is_redeemed: boolean;
  redeemed_at?: string;
  created_at: string;
}

export const DEFAULT_PRIZES: RewardPrize[] = [
  {
    id: "prize-loreal-shampoo",
    label: "Free L'Oréal Shampoo",
    shortLabel: "L'Oréal Shampoo",
    type: "product_gift",
    value: 650,
    color: "#3b82f6", // Blue
    textColor: "#ffffff",
    iconName: "Gift",
    description: "Complimentary bottle of L'Oréal Professionnel Shampoo",
    requiresInventoryDeduction: true,
  },
  {
    id: "prize-dtan-service",
    label: "Free D-Tan Service",
    shortLabel: "D-Tan Service",
    type: "service",
    value: 500,
    color: "#8b5cf6", // Purple
    textColor: "#ffffff",
    iconName: "Sparkles",
    description: "Complimentary face & neck D-Tan brightening glow treatment",
    requiresInventoryDeduction: true,
  },
  {
    id: "prize-hair-cut-service",
    label: "Free Hair Cut Service",
    shortLabel: "Hair Cut Service",
    type: "service",
    value: 500,
    color: "#ec4899", // Pink
    textColor: "#ffffff",
    iconName: "Scissors",
    description: "Precision hair styling & cut by senior stylist",
    requiresInventoryDeduction: true,
  },
  {
    id: "prize-loreal-mask",
    label: "Free L'Oréal absolute repair hair mask",
    shortLabel: "L'Oréal Repair Mask",
    type: "product_gift",
    value: 850,
    color: "#10b981", // Emerald
    textColor: "#ffffff",
    iconName: "Package",
    description: "Luxury L'Oréal Professionnel Absolut Repair deep conditioning hair mask",
    requiresInventoryDeduction: true,
  },
];

export const DEFAULT_KANPEKI_PRIZES: RewardPrize[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    label: "Free Detan Service",
    shortLabel: "Detan Service",
    type: "service",
    value: 500,
    color: "#10b981", // Emerald
    textColor: "#ffffff",
    iconName: "Sparkles",
    description: "Complimentary face & neck Detan brightening glow treatment",
    requiresInventoryDeduction: false,
    weight: 50,
    quantity: 30,
  },
  {
    id: "00000000-0000-0000-0000-000000000302",
    label: "Free Hair Cut",
    shortLabel: "Hair Cut",
    type: "service",
    value: 500,
    color: "#ec4899", // Pink
    textColor: "#ffffff",
    iconName: "Scissors",
    description: "Precision hair styling & cut by senior stylist",
    requiresInventoryDeduction: false,
    weight: 16.67,
    quantity: 30,
  },
  {
    id: "00000000-0000-0000-0000-000000000303",
    label: "Free Shaving / Face Threading",
    shortLabel: "Shaving / Threading",
    type: "service",
    value: 300,
    color: "#3b82f6", // Blue
    textColor: "#ffffff",
    iconName: "Scissors",
    description: "Professional clean shaving or delicate face threading",
    requiresInventoryDeduction: false,
    weight: 16.67,
    quantity: 30,
  },
  {
    id: "00000000-0000-0000-0000-000000000304",
    label: "Free Head Wash",
    shortLabel: "Head Wash",
    type: "service",
    value: 300,
    color: "#8b5cf6", // Purple
    textColor: "#ffffff",
    iconName: "Sparkles",
    description: "Relaxing deep cleanse scalp & head wash ritual",
    requiresInventoryDeduction: false,
    weight: 16.66,
    quantity: 30,
  },
];

/**
 * Strips product quantities and volumes (e.g., "300ml", "300 ml", "(300ml)", "100g", "250 ml")
 * from offer names, prize labels, and descriptions.
 */
export function removeProductQuantity(text: string): string {
  if (!text) return "";
  return text
    .replace(/\s*\(\s*\d+\s*(?:ml|g|gm|kg|l|ltr|liter|litres|oz)\s*\)/gi, "")
    .replace(/\s+\d+\s*(?:ml|g|gm|kg|ltr|liter|litres|oz)\b/gi, "")
    .replace(/\b\d+\s*(?:ml|g|gm|kg|ltr|liter|litres|oz)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Returns the probability weight for an item/prize.
 * Exact specified probabilities:
 * • Detan: 50% chance (weight: 50)
 * • Hair cut: 16.67% chance (weight: 16.67)
 * • Shaving / face threading: 16.67% chance (weight: 16.67)
 * • Head wash: 16.66% chance (weight: 16.66)
 *
 * Items with 0 quantity (out of stock) or is_active === false return 0.
 */
export function getPrizeWeight(item: {
  title?: string;
  label?: string;
  weight?: number;
  quantity?: number;
  is_active?: boolean;
}): number {
  if (item.is_active === false) return 0;
  if (typeof item.quantity === "number" && item.quantity <= 0) return 0;
  if (typeof item.weight === "number" && !isNaN(item.weight) && item.weight >= 0) {
    return item.weight;
  }

  const name = (item.title || item.label || "").toLowerCase();
  if (name.includes("detan") || name.includes("de-tan") || name.includes("d-tan")) {
    return 50;
  }
  if (name.includes("hair cut") || name.includes("haircut")) {
    return 16.67;
  }
  if (name.includes("shaving") || name.includes("threading")) {
    return 16.67;
  }
  if (name.includes("head wash") || name.includes("headwash") || name.includes("hair wash")) {
    return 16.66;
  }

  return 10;
}

/**
 * Pre-calculates the winning index using weighted probabilities before the wheel animation starts.
 * Slices with 0 weight (or 0 inventory stock) are excluded from winning.
 * Probabilities are normalized across all eligible in-stock items.
 */
export function pickWeightedPrizeIndex<
  T extends {
    title?: string;
    label?: string;
    weight?: number;
    quantity?: number;
    is_active?: boolean;
  }
>(items: T[], numSlicesFallback: number = items.length): number {
  if (!items || items.length === 0) {
    return Math.floor(Math.random() * Math.max(1, numSlicesFallback));
  }

  const weights = items.map((item) => Math.max(0, getPrizeWeight(item)));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // If all items have 0 weight (e.g. everything is out of stock), pick an available item or fallback
  if (totalWeight <= 0) {
    const eligibleIndices = items
      .map((it, idx) => ({
        idx,
        ok: it.is_active !== false && (it.quantity === undefined || it.quantity > 0),
      }))
      .filter((x) => x.ok)
      .map((x) => x.idx);
    if (eligibleIndices.length > 0) {
      return eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
    }
    return Math.floor(Math.random() * items.length);
  }

  const randomVal = Math.random() * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (randomVal < cumulative) {
      return i;
    }
  }

  // Fallback safeguard against precision error at top edge
  return items.length - 1;
}


