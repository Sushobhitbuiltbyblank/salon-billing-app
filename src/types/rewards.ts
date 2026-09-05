export type SpinGameState =
  | "IDLE"
  | "SPINNING"
  | "WON_PENDING_VERIFICATION"
  | "VERIFIED_AND_REVEALED";

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
