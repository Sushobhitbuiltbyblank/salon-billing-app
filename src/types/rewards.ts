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
  eventDate: "Saturday, November 28, 2026",
  eventVenue: "Belezia Salon, Laxmi Nagar",
  offerPrefix: "BZ-KANPEKI-",
  isSpinActive: true,
  instagramUrl: "https://www.instagram.com/beleziasalonlaxminagar/",
  instagramHandle: "@beleziasalonlaxminagar",
};

export const DEFAULT_KANPEKI_INVENTORY: WheelInventoryItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    title: "Free Kanpeki Skin Facial",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#ec4899", // Pink
  },
  {
    id: "00000000-0000-0000-0000-000000000302",
    title: "Free Kanpeki Hair Spa Ritual",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#8b5cf6", // Purple
  },
  {
    id: "00000000-0000-0000-0000-000000000303",
    title: "Free Kanpeki Professional Gift",
    category: "gift",
    quantity: 30,
    is_active: true,
    color: "#3b82f6", // Blue
  },
  {
    id: "00000000-0000-0000-0000-000000000304",
    title: "Free D-Tan Brightening Service",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#10b981", // Emerald
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

