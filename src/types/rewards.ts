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
    id: "00000000-0000-0000-0000-000000000101",
    title: "Win VIP Gift",
    category: "gift",
    quantity: 10,
    is_active: true,
    color: "#f43f5e",
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    title: "Free Hair Spa",
    category: "free_service",
    quantity: 30,
    is_active: true,
    color: "#3b82f6",
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    title: "20% Discount",
    category: "discount_coupon",
    quantity: 5,
    is_active: true,
    color: "#ec4899",
  },
  {
    id: "00000000-0000-0000-0000-000000000104",
    title: "100 Rupee Off",
    category: "offer",
    quantity: 15,
    is_active: true,
    color: "#10b981",
  },
  {
    id: "00000000-0000-0000-0000-000000000105",
    title: "Free De-Tan",
    category: "free_service",
    quantity: 10,
    is_active: true,
    color: "#8b5cf6",
  },
  {
    id: "00000000-0000-0000-0000-000000000106",
    title: "40% Discount on Product Purchase of 1000",
    category: "offer",
    quantity: 10,
    is_active: true,
    color: "#f59e0b",
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

export const DEFAULT_PRIZES: RewardPrize[] = [
  {
    id: "prize-detan",
    label: "Free De-Tan Glow",
    shortLabel: "Free De-Tan",
    type: "service",
    value: 500,
    color: "#8b5cf6", // Purple
    textColor: "#ffffff",
    iconName: "Sparkles",
    description: "Complimentary face & neck De-Tan glow treatment",
    requiresInventoryDeduction: false,
  },
  {
    id: "prize-disc-20",
    label: "20% Off Next Bill",
    shortLabel: "20% Discount",
    type: "discount_percent",
    value: 20,
    color: "#ec4899", // Pink
    textColor: "#ffffff",
    iconName: "Percent",
    description: "Flat 20% discount applied to your total salon billing",
    requiresInventoryDeduction: false,
  },
  {
    id: "prize-hair-spa",
    label: "Free Hair Spa",
    shortLabel: "Free Spa",
    type: "service",
    value: 800,
    color: "#3b82f6", // Blue
    textColor: "#ffffff",
    iconName: "Droplet",
    description: "Deep conditioning Loreal Professional Hair Spa",
    requiresInventoryDeduction: false,
  },
  {
    id: "prize-voucher-200",
    label: "₹200 Salon Voucher",
    shortLabel: "₹200 Off",
    type: "discount_flat",
    value: 200,
    color: "#10b981", // Emerald
    textColor: "#ffffff",
    iconName: "Gift",
    description: "Flat ₹200 off on any service or product purchase",
    requiresInventoryDeduction: false,
  },
  {
    id: "prize-product-gift",
    label: "Luxury Styling Product",
    shortLabel: "Product Gift",
    type: "product_gift",
    value: 450,
    color: "#f59e0b", // Amber
    textColor: "#000000",
    iconName: "Package",
    description: "Complimentary salon-grade styling serum or wax product",
    requiresInventoryDeduction: true,
  },
  {
    id: "prize-disc-10",
    label: "10% Off Any Service",
    shortLabel: "10% Discount",
    type: "discount_percent",
    value: 10,
    color: "#6366f1", // Indigo
    textColor: "#ffffff",
    iconName: "Tag",
    description: "10% instant discount on any hair or skin service",
    requiresInventoryDeduction: false,
  },
  {
    id: "prize-beard-trim",
    label: "Free Beard Grooming",
    shortLabel: "Free Grooming",
    type: "service",
    value: 250,
    color: "#06b6d4", // Cyan
    textColor: "#ffffff",
    iconName: "Scissors",
    description: "Precision razor styling & beard trim by senior stylist",
    requiresInventoryDeduction: false,
  },
  {
    id: "prize-vip-hamper",
    label: "VIP Beauty Hamper",
    shortLabel: "VIP Gift",
    type: "product_gift",
    value: 650,
    color: "#f43f5e", // Rose
    textColor: "#ffffff",
    iconName: "Crown",
    description: "Deluxe travel haircare & skincare kit gift",
    requiresInventoryDeduction: true,
  },
];
