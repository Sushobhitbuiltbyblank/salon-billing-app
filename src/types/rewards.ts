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

export const DEFAULT_WHEEL_INVENTORY: WheelInventoryItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000201",
    title: "Free L'Oréal Shampoo",
    category: "gift",
    quantity: 30,
    is_active: true,
    color: "#3b82f6", // Blue
  },
  {
    id: "00000000-0000-0000-0000-000000000202",
    title: "Free L'Oréal Facewash",
    category: "gift",
    quantity: 30,
    is_active: true,
    color: "#06b6d4", // Cyan
  },
  {
    id: "00000000-0000-0000-0000-000000000203",
    title: "Free D-Tan Service",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#8b5cf6", // Purple
  },
  {
    id: "00000000-0000-0000-0000-000000000204",
    title: "Free Hair Cut Service",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#ec4899", // Pink
  },
  {
    id: "00000000-0000-0000-0000-000000000205",
    title: "Free L'Oréal absolute repair hair mask",
    category: "gift",
    quantity: 30,
    is_active: true,
    color: "#10b981", // Emerald
  },
];

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
    description: "Complimentary bottle of L'Oréal Professionnel Shampoo (300ml)",
    requiresInventoryDeduction: true,
  },
  {
    id: "prize-loreal-facewash",
    label: "Free L'Oréal Facewash",
    shortLabel: "L'Oréal Facewash",
    type: "product_gift",
    value: 450,
    color: "#06b6d4", // Cyan
    textColor: "#ffffff",
    iconName: "Droplet",
    description: "Complimentary salon-grade L'Oréal Facewash cleanser",
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
