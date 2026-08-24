import {
  AppUser,
  CatalogItem,
  Category,
  Customer,
  Expense,
  Invoice,
  SalonSettings,
  Staff,
  AttendanceRecord,
  AttendanceStatus,
} from "@/types";
import { generateUUID } from "./utils";
import {
  deduplicateCustomerArray,
  normalizePhoneNumber,
  normalizeCustomerName,
  isAnonymousCustomerName,
} from "./customerUtils";

// STORAGE KEYS
const STORAGE_PREFIX = "belezia_pos_";
const KEYS = {
  USERS: `${STORAGE_PREFIX}users`,
  CURRENT_USER: `${STORAGE_PREFIX}current_user`,
  SETTINGS: `${STORAGE_PREFIX}settings`,
  STAFF: `${STORAGE_PREFIX}staff`,
  ATTENDANCE: `${STORAGE_PREFIX}attendance`,
  CATEGORIES: `${STORAGE_PREFIX}categories`,
  CATALOG: `${STORAGE_PREFIX}catalog`,
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  INVOICES: `${STORAGE_PREFIX}invoices`,
  EXPENSES: `${STORAGE_PREFIX}expenses`,
  DELETED_CATALOG_IDS: `${STORAGE_PREFIX}deleted_catalog_ids`,
  INITIALIZED: `${STORAGE_PREFIX}full_catalog_v5`,
};

// PRODUCTION USERS: 2 ADMINS (SUSHOBHIT & PRABHAT) + 1 RECEPTIONIST (AMIT) (@belezia.com)
export const DEFAULT_USERS: AppUser[] = [
  {
    id: "usr-admin-01",
    name: "Sushobhit Jain",
    email: "sushobhit@belezia.com",
    role: "admin",
    pin: "9999",
    avatar_color: "#8b5cf6", // Purple
    phone: "+91 98765 00099",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "usr-admin-02",
    name: "Prabhat Jain",
    email: "prabhat@belezia.com",
    role: "admin",
    pin: "3112",
    avatar_color: "#3b82f6", // Blue
    phone: "+91 98765 00098",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "usr-rec-01",
    name: "Amit Sharma",
    email: "amit@belezia.com",
    role: "receptionist",
    pin: "1001",
    avatar_color: "#ec4899", // Pink
    phone: "+91 98765 00101",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// CLEAN SALON BUSINESS SETTINGS
export const DEFAULT_SETTINGS: SalonSettings = {
  id: "00000000-0000-0000-0000-000000000001",
  salon_name: "Belezia Salon Laxmi Nagar",
  tagline: "Ultra-Premium Unisex Salon & Spa Experience",
  address: "Shop 14-16, Main Market, Laxmi Nagar, New Delhi, 110092",
  phone: "+91 98765 43210",
  email: "hello@belezia.com",
  gst_number: "29ABCDE1234F1Z5",
  currency_symbol: "₹",
  currency_code: "INR",
  upi_id: "belezia@okaxis",
  google_review_url: "https://g.page/r/CbGd_cwnL9zrEBM/review",
  instagram_url: "https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr",
  thermal_width: "80mm",
  tax_rate: 18.0,
  tax_enabled: true,
  invoice_prefix: "BZ-",
};

// 9 SERVICE, PRODUCT & PACKAGE CATEGORIES
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "22222222-2222-2222-2222-222222222209", name: "Packages & Combos", type: "package", icon: "Sparkles" },
  { id: "22222222-2222-2222-2222-222222222201", name: "Basic Services (Men)", type: "service", icon: "Scissors" },
  { id: "22222222-2222-2222-2222-222222222202", name: "Detan (Men)", type: "service", icon: "Sparkles" },
  { id: "22222222-2222-2222-2222-222222222203", name: "Bleach", type: "service", icon: "Sun" },
  { id: "22222222-2222-2222-2222-222222222204", name: "Facial & Mask", type: "service", icon: "Smile" },
  { id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa (Loreal)", type: "service", icon: "Droplet" },
  { id: "22222222-2222-2222-2222-222222222206", name: "Hair Colour (Loreal Majirel)", type: "service", icon: "Palette" },
  { id: "22222222-2222-2222-2222-222222222207", name: "Haircare Products", type: "product", icon: "Package" },
  { id: "22222222-2222-2222-2222-222222222208", name: "Skincare Products", type: "product", icon: "Droplet" },
];

// 5 REAL STAFF MEMBERS (WITH UUIDs FOR POSTGRESQL COMPATIBILITY)
export const DEFAULT_STAFF: Staff[] = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    name: "Aamir",
    role: "Senior Stylist",
    phone: "",
    commission_rate: 15,
    commission_type: "percent",
    product_commission_rate: 10,
    product_commission_type: "percent",
    status: "active",
    color: "#6366f1",
    notes: "Senior Stylist",
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    name: "Subhaan",
    role: "Stylist",
    phone: "",
    commission_rate: 15,
    commission_type: "percent",
    product_commission_rate: 10,
    product_commission_type: "percent",
    status: "active",
    color: "#ec4899",
    notes: "Stylist",
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    name: "Arbaaz",
    role: "Stylist",
    phone: "",
    commission_rate: 15,
    commission_type: "percent",
    product_commission_rate: 10,
    product_commission_type: "percent",
    status: "active",
    color: "#06b6d4",
    notes: "Stylist",
  },
  {
    id: "11111111-1111-1111-1111-111111111104",
    name: "Mahi",
    role: "Beautician Stylist",
    phone: "",
    commission_rate: 15,
    commission_type: "percent",
    product_commission_rate: 10,
    product_commission_type: "percent",
    status: "active",
    color: "#10b981",
    notes: "Beautician Stylist",
  },
  {
    id: "11111111-1111-1111-1111-111111111105",
    name: "Sitara",
    role: "Beautician Stylist",
    phone: "",
    commission_rate: 15,
    commission_type: "percent",
    product_commission_rate: 10,
    product_commission_type: "percent",
    status: "active",
    color: "#f59e0b",
    notes: "Beautician Stylist",
  },
];

// 49 REAL SERVICES + 36 REAL RETAIL PRODUCTS (85 TOTAL CATALOG ITEMS)
export const DEFAULT_CATALOG: CatalogItem[] = [
  // 1. Basic services (Men)
  { id: "33333333-3333-3333-3333-333333330001", category_id: "22222222-2222-2222-2222-222222222201", name: "Shaving", type: "service", price: 100, is_active: true },
  { id: "33333333-3333-3333-3333-333333330002", category_id: "22222222-2222-2222-2222-222222222201", name: "Haircut", type: "service", price: 150, is_active: true },
  { id: "33333333-3333-3333-3333-333333330003", category_id: "22222222-2222-2222-2222-222222222201", name: "Hair Wash - Shampoo + Conditioner", type: "service", price: 100, is_active: true },
  { id: "33333333-3333-3333-3333-333333330004", category_id: "22222222-2222-2222-2222-222222222201", name: "Hair Wash - Shampoo Only", type: "service", price: 50, is_active: true },

  // 2. Detan (Men)
  { id: "33333333-3333-3333-3333-333333330005", category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Beardo", type: "service", price: 300, is_active: true },
  { id: "33333333-3333-3333-3333-333333330006", category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Ozon", type: "service", price: 400, is_active: true },
  { id: "33333333-3333-3333-3333-333333330007", category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - O3+", type: "service", price: 500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330008", category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Kanpeki", type: "service", price: 700, is_active: true },
  { id: "33333333-3333-3333-3333-333333330009", category_id: "22222222-2222-2222-2222-222222222202", name: "Detan - Sara", type: "service", price: 400, is_active: true },

  // 3. Bleach (Men / Women)
  { id: "33333333-3333-3333-3333-333333330010", category_id: "22222222-2222-2222-2222-222222222203", name: "Bleach - Fruit", type: "service", price: 300, is_active: true },
  { id: "33333333-3333-3333-3333-333333330011", category_id: "22222222-2222-2222-2222-222222222203", name: "Bleach - Ozon", type: "service", price: 500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330012", category_id: "22222222-2222-2222-2222-222222222203", name: "Bleach - Oxy", type: "service", price: 700, is_active: true },

  // 4. Facial & mask
  { id: "33333333-3333-3333-3333-333333330013", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Just O2 - Mask", type: "service", price: 500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330014", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Just O2 - Facial", type: "service", price: 1500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330015", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Aroma Magic - Facial", type: "service", price: 1500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330016", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - Whitening", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330017", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - Power Glow Cleanup", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330018", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - MelaDerm", type: "service", price: 4000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330019", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - O3+ - Derma Cult", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330020", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Beardo - Power Glow", type: "service", price: 1500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330021", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Beardo - War Zone", type: "service", price: 1500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330022", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Beardo - Gold", type: "service", price: 1500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330023", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Lotus - Gold Sheen", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330024", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Lotus - Insta Fair", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330025", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Sara - Korean Facial", type: "service", price: 4200, is_active: true },
  { id: "33333333-3333-3333-3333-333333330026", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - 4-Step", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330027", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Mango", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330028", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Papaya", type: "service", price: 4000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330029", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Coconut", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330030", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Avocado", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330031", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Pumpkin", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330032", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Quinoa", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330033", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Kanpeki - Chocolate", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330034", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - De-Tan", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330035", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Glow For Sure", type: "service", price: 2500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330036", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Acne", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330037", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - PST", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330038", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - CBT", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330039", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Restoring Youth", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330040", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Vitamin C", type: "service", price: 2000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330041", category_id: "22222222-2222-2222-2222-222222222204", name: "Facial - Ozone - Illuminous Gold", type: "service", price: 2500, is_active: true },

  // 5. Men's hair spa (Loreal)
  { id: "33333333-3333-3333-3333-333333330042", category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Nourishment", type: "service", price: 600, is_active: true },
  { id: "33333333-3333-3333-3333-333333330043", category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Absolute Repair", type: "service", price: 1000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330044", category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Liss Unlimited", type: "service", price: 1000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330045", category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Inforcer", type: "service", price: 1000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330046", category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Vitamin O", type: "service", price: 1000, is_active: true },
  { id: "33333333-3333-3333-3333-333333330047", category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Scalp Advance", type: "service", price: 1500, is_active: true },
  { id: "33333333-3333-3333-3333-333333330048", category_id: "22222222-2222-2222-2222-222222222205", name: "Hair Spa - Loreal - Absolute Repair Molecule", type: "service", price: 2500, is_active: true },

  // 6. Men's hair colour (Loreal Majirel)
  { id: "33333333-3333-3333-3333-333333330049", category_id: "22222222-2222-2222-2222-222222222206", name: "Hair Colour - Loreal Majirel - Base 3 No", type: "service", price: 600, is_active: true },
  { id: "33333333-3333-3333-3333-333333330050", category_id: "22222222-2222-2222-2222-222222222206", name: "Hair Colour - Loreal Majirel - Base 3 No Inoa", type: "service", price: 800, is_active: true },

  // 7. Haircare Products (Retail for sale: 4x Sale Price + Cost Price Tracking)
  { id: "33333333-3333-3333-3333-333333330101", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal Absolute Repair - Shampoo", type: "product", cost_price: 790, price: 790 * 4, sku: "PRD-LRL-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330102", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Blue - Shampoo", type: "product", cost_price: 690, price: 690 * 4, sku: "PRD-LRL-02", is_active: true },
  { id: "33333333-3333-3333-3333-333333330103", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Blue - Mask", type: "product", cost_price: 850, price: 850 * 4, sku: "PRD-LRL-03", is_active: true },
  { id: "33333333-3333-3333-3333-333333330104", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Gold - Shampoo", type: "product", cost_price: 1120, price: 1120 * 4, sku: "PRD-LRL-04", is_active: true },
  { id: "33333333-3333-3333-3333-333333330105", category_id: "22222222-2222-2222-2222-222222222207", name: "L'Oréal xtansho Gold - Mask", type: "product", cost_price: 1290, price: 1290 * 4, sku: "PRD-LRL-05", is_active: true },
  { id: "33333333-3333-3333-3333-333333330106", category_id: "22222222-2222-2222-2222-222222222207", name: "Krone - Shampoo", type: "product", cost_price: 850, price: 850 * 4, sku: "PRD-KRN-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330107", category_id: "22222222-2222-2222-2222-222222222207", name: "Krone - Mask", type: "product", cost_price: 600, price: 600 * 4, sku: "PRD-KRN-02", is_active: true },
  { id: "33333333-3333-3333-3333-333333330108", category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Serum", type: "product", cost_price: 299, price: 299 * 4, sku: "PRD-GDJ-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330109", category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Keracare Shampoo", type: "product", cost_price: 1200, price: 1200 * 4, sku: "PRD-GDJ-02", is_active: true },
  { id: "33333333-3333-3333-3333-333333330110", category_id: "22222222-2222-2222-2222-222222222207", name: "Godrej - Keracare Conditioner", type: "product", cost_price: 1200, price: 1200 * 4, sku: "PRD-GDJ-03", is_active: true },
  { id: "33333333-3333-3333-3333-333333330111", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Shampoo", type: "product", cost_price: 1395, price: 1395 * 4, sku: "PRD-72-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330112", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Mask", type: "product", cost_price: 1695, price: 1695 * 4, sku: "PRD-72-02", is_active: true },
  { id: "33333333-3333-3333-3333-333333330113", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Serum", type: "product", cost_price: 1195, price: 1195 * 4, sku: "PRD-72-03", is_active: true },
  { id: "33333333-3333-3333-3333-333333330114", category_id: "22222222-2222-2222-2222-222222222207", name: "72 - Conditioner", type: "product", cost_price: 1395, price: 1395 * 4, sku: "PRD-72-04", is_active: true },
  { id: "33333333-3333-3333-3333-333333330115", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Smooth - Shampoo", type: "product", cost_price: 1150, price: 1150 * 4, sku: "PRD-PV-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330116", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Smooth - Conditioner", type: "product", cost_price: 1200, price: 1200 * 4, sku: "PRD-PV-02", is_active: true },
  { id: "33333333-3333-3333-3333-333333330117", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Hydration - Shampoo", type: "product", cost_price: 1150, price: 1150 * 4, sku: "PRD-PV-03", is_active: true },
  { id: "33333333-3333-3333-3333-333333330118", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Hydration - Conditioner", type: "product", cost_price: 1200, price: 1200 * 4, sku: "PRD-PV-04", is_active: true },
  { id: "33333333-3333-3333-3333-333333330119", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Repair - Shampoo", type: "product", cost_price: 1150, price: 1150 * 4, sku: "PRD-PV-05", is_active: true },
  { id: "33333333-3333-3333-3333-333333330120", category_id: "22222222-2222-2222-2222-222222222207", name: "Pro Viva Repair - Conditioner", type: "product", cost_price: 1200, price: 1200 * 4, sku: "PRD-PV-06", is_active: true },
  { id: "33333333-3333-3333-3333-333333330121", category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Shampoo", type: "product", cost_price: 990, price: 990 * 4, sku: "PRD-KAS-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330122", category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Mask", type: "product", cost_price: 1290, price: 1290 * 4, sku: "PRD-KAS-02", is_active: true },
  { id: "33333333-3333-3333-3333-333333330123", category_id: "22222222-2222-2222-2222-222222222207", name: "Loreal KAS - Transform Creame", type: "product", cost_price: 1800, price: 1800 * 4, sku: "PRD-KAS-03", is_active: true },

  // 8. Skincare Products (Retail for sale: 4x Sale Price + Cost Price Tracking)
  { id: "33333333-3333-3333-3333-333333330124", category_id: "22222222-2222-2222-2222-222222222208", name: "ABC - Serum", type: "product", cost_price: 1799, price: 1799 * 4, sku: "PRD-ABC-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330125", category_id: "22222222-2222-2222-2222-222222222208", name: "C-10 - Serum", type: "product", cost_price: 1199, price: 1199 * 4, sku: "PRD-C10-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330126", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Face Oil - Oil", type: "product", cost_price: 1903, price: 1903 * 4, sku: "PRD-OZN-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330127", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Complexion Brightening - Facewash", type: "product", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-02", is_active: true },
  { id: "33333333-3333-3333-3333-333333330128", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Complexion Brightening - Cream", type: "product", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-03", is_active: true },
  { id: "33333333-3333-3333-3333-333333330129", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Perfect Skin Tone - Facewash", type: "product", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-04", is_active: true },
  { id: "33333333-3333-3333-3333-333333330130", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Perfect Skin Tone - Cream", type: "product", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-05", is_active: true },
  { id: "33333333-3333-3333-3333-333333330131", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Youth Restoring - Facewash", type: "product", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-06", is_active: true },
  { id: "33333333-3333-3333-3333-333333330132", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Youth Restoring - Cream", type: "product", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-07", is_active: true },
  { id: "33333333-3333-3333-3333-333333330133", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Acne Check - Facewash", type: "product", cost_price: 290, price: 290 * 4, sku: "PRD-OZN-08", is_active: true },
  { id: "33333333-3333-3333-3333-333333330134", category_id: "22222222-2222-2222-2222-222222222208", name: "Ozone Acne Check - Cream", type: "product", cost_price: 350, price: 350 * 4, sku: "PRD-OZN-09", is_active: true },
  { id: "33333333-3333-3333-3333-333333330135", category_id: "22222222-2222-2222-2222-222222222208", name: "Kanpeki - Balancing Cleanser", type: "product", cost_price: 960, price: 960 * 4, sku: "PRD-KNP-01", is_active: true },
  { id: "33333333-3333-3333-3333-333333330136", category_id: "22222222-2222-2222-2222-222222222208", name: "Kanpeki - Facial Wash", type: "product", cost_price: 960, price: 960 * 4, sku: "PRD-KNP-02", is_active: true },
];

export const DEFAULT_CUSTOMERS: Customer[] = [];
export const DEFAULT_INVOICES: Invoice[] = [];
export const DEFAULT_EXPENSES: Expense[] = [];

// INITIALIZATION: CLEARS OLD DEMO DATA & SETS FRESH SLATE WITH REAL STAFF
export function initStorage() {
  if (typeof window === "undefined") return;

  try {
    const initialized = localStorage.getItem(KEYS.INITIALIZED);
    if (!initialized) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      // Do NOT auto-login user on first visit — prompt for PIN/Email login
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.setItem(KEYS.CATALOG, JSON.stringify(DEFAULT_CATALOG));
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
      localStorage.setItem(KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
      localStorage.setItem(KEYS.INITIALIZED, "true");
    } else {
      // Migrate existing users and preserve registered credentials
      const rawUsers = localStorage.getItem(KEYS.USERS);
      if (rawUsers) {
        try {
          const storedUsers = JSON.parse(rawUsers);
          if (Array.isArray(storedUsers)) {
            const filteredUsers = storedUsers
              .filter((u) => u && typeof u === "object" && (u.id === "usr-admin-01" || u.id === "usr-admin-02" || u.id === "usr-rec-01" || (typeof u.id === "string" && u.id.startsWith("usr-visitor-"))))
              .map((u) => {
                if (u.id === "usr-admin-01") {
                  return { ...u, name: "Sushobhit Jain", email: "sushobhit@belezia.com", role: "admin" as const, pin: u.pin || "9999" };
                }
                if (u.id === "usr-admin-02") {
                  return { ...u, name: "Prabhat Jain", email: "prabhat@belezia.com", role: "admin" as const, pin: u.pin || "3112" };
                }
                if (u.id === "usr-rec-01") {
                  return { ...u, name: "Amit Sharma", email: "amit@belezia.com", role: "receptionist" as const, pin: u.pin || "1001" };
                }
                return u;
              });

            // Ensure Sushobhit, Prabhat, and Amit exist in user list
            if (!filteredUsers.some((u) => u.id === "usr-admin-01")) {
              filteredUsers.unshift(DEFAULT_USERS[0]);
            }
            if (!filteredUsers.some((u) => u.id === "usr-admin-02")) {
              filteredUsers.splice(1, 0, DEFAULT_USERS[1]);
            }
            if (!filteredUsers.some((u) => u.id === "usr-rec-01")) {
              filteredUsers.push(DEFAULT_USERS[2]);
            }

            localStorage.setItem(KEYS.USERS, JSON.stringify(filteredUsers.length > 0 ? filteredUsers : DEFAULT_USERS));
          } else {
            localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
          }
        } catch {
          localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
        }
      } else {
        localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      }

      // Migrate categories if package category missing
      const rawCategories = localStorage.getItem(KEYS.CATEGORIES);
      if (rawCategories) {
        try {
          const storedCats: Category[] = JSON.parse(rawCategories);
          if (Array.isArray(storedCats) && !storedCats.some((c) => c.type === "package" || c.id === "22222222-2222-2222-2222-222222222209")) {
            storedCats.unshift(DEFAULT_CATEGORIES[0]);
            localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(storedCats));
          }
        } catch {}
      }

      // Migrate salon settings to ensure updated name
      const rawSettings = localStorage.getItem(KEYS.SETTINGS);
      if (rawSettings) {
        try {
          const storedSettings = JSON.parse(rawSettings);
          if (
            storedSettings &&
            (storedSettings.salon_name?.includes("Luxe") ||
              storedSettings.salon_name?.includes("Belezia Luxury"))
          ) {
            storedSettings.salon_name = "Belezia Salon Laxmi Nagar";
            storedSettings.address = "Shop 14-16, Main Market, Laxmi Nagar, New Delhi, 110092";
            localStorage.setItem(KEYS.SETTINGS, JSON.stringify(storedSettings));
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error("initStorage error:", err);
  }
}

// STORAGE API
export const Storage = {
  // USERS & AUTH
  getUsers(): AppUser[] {
    if (typeof window === "undefined") return DEFAULT_USERS;
    try {
      const raw = localStorage.getItem(KEYS.USERS);
      if (!raw) return DEFAULT_USERS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  },
  saveUsers(users: AppUser[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  },
  saveUser(user: AppUser): AppUser {
    const list = this.getUsers();
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    this.saveUsers(list);
    return user;
  },
  deleteUser(userId: string): void {
    const list = this.getUsers().filter((u) => u.id !== userId);
    this.saveUsers(list);
  },
  getCurrentUser(): AppUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEYS.CURRENT_USER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setCurrentUser(user: AppUser | null): void {
    if (typeof window === "undefined") return;
    try {
      if (user) {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // SETTINGS
  getSettings(): SalonSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings(settings: SalonSettings): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  },

  // STAFF
  getStaff(): Staff[] {
    if (typeof window === "undefined") return DEFAULT_STAFF;
    try {
      const raw = localStorage.getItem(KEYS.STAFF);
      if (!raw) return DEFAULT_STAFF;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STAFF;
    } catch {
      return DEFAULT_STAFF;
    }
  },
  saveStaff(staffList: Staff[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
    } catch (e) {
      console.error(e);
    }
  },
  addStaffMember(staffMember: Staff): Staff {
    const list = this.getStaff();
    list.push(staffMember);
    this.saveStaff(list);
    return staffMember;
  },
  updateStaffMember(staffMember: Staff): void {
    const list = this.getStaff();
    const index = list.findIndex((s) => s.id === staffMember.id);
    if (index >= 0) {
      list[index] = staffMember;
    } else {
      list.push(staffMember);
    }
    this.saveStaff(list);
  },
  deleteStaffMember(staffId: string): void {
    const list = this.getStaff().filter((s) => s.id !== staffId);
    this.saveStaff(list);
  },

  // STAFF ATTENDANCE
  getAttendance(): AttendanceRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.ATTENDANCE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  saveAttendance(records: AttendanceRecord[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  },
  markAttendance(
    staffId: string,
    date: string, // YYYY-MM-DD
    status: AttendanceStatus,
    notes?: string,
    staffName?: string
  ): AttendanceRecord {
    const records = this.getAttendance();
    const existingIndex = records.findIndex(
      (r) => r.staff_id === staffId && r.date === date
    );

    const now = new Date().toISOString();
    let updatedRecord: AttendanceRecord;

    if (existingIndex >= 0) {
      updatedRecord = {
        ...records[existingIndex],
        status,
        notes: notes !== undefined ? notes : records[existingIndex].notes,
        staff_name: staffName || records[existingIndex].staff_name,
        updated_at: now,
      };
      records[existingIndex] = updatedRecord;
    } else {
      updatedRecord = {
        id: generateUUID(),
        staff_id: staffId,
        staff_name: staffName,
        date,
        status,
        notes,
        created_at: now,
        updated_at: now,
      };
      records.push(updatedRecord);
    }

    this.saveAttendance(records);

    // If marking for today's date, also sync the staff status on the floor
    const today = new Date().toISOString().slice(0, 10);
    if (date === today) {
      const staffList = this.getStaff();
      const st = staffList.find((s) => s.id === staffId);
      if (st) {
        if (status === "present") st.status = "active";
        else if (status === "half_day") st.status = "half_day";
        else if (status === "on_leave") st.status = "on_leave";
        else if (status === "weekly_off") st.status = "weekly_off";
        else if (status === "absent") st.status = "on_leave";
        this.saveStaff(staffList);
      }
    }

    return updatedRecord;
  },

  // CATEGORIES
  getCategories(): Category[] {
    if (typeof window === "undefined") return DEFAULT_CATEGORIES;
    try {
      const raw = localStorage.getItem(KEYS.CATEGORIES);
      if (!raw) return DEFAULT_CATEGORIES;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },
  saveCategories(categories: Category[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  },
  saveCategory(category: Category): Category {
    const list = this.getCategories();
    const idx = list.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    this.saveCategories(list);
    return category;
  },
  deleteCategory(categoryId: string): void {
    const list = this.getCategories().filter((c) => c.id !== categoryId);
    this.saveCategories(list);
  },

  // CATALOG
  getCatalog(): CatalogItem[] {
    if (typeof window === "undefined") return DEFAULT_CATALOG;
    try {
      const raw = localStorage.getItem(KEYS.CATALOG);
      if (!raw) return DEFAULT_CATALOG;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATALOG;
    } catch {
      return DEFAULT_CATALOG;
    }
  },
  saveCatalog(items: CatalogItem[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.CATALOG, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  },
  saveCatalogItem(item: CatalogItem): void {
    const list = this.getCatalog();
    const index = list.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.push(item);
    }
    this.saveCatalog(list);
  },
  deleteCatalogItem(itemId: string): void {
    const list = this.getCatalog().filter((i) => i.id !== itemId);
    this.saveCatalog(list);
  },

  // CUSTOMERS
  getCustomers(): Customer[] {
    if (typeof window === "undefined") return DEFAULT_CUSTOMERS;
    try {
      const raw = localStorage.getItem(KEYS.CUSTOMERS);
      if (!raw) return DEFAULT_CUSTOMERS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? deduplicateCustomerArray(parsed) : DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  },
  saveCustomers(customers: Customer[]): void {
    if (typeof window === "undefined") return;
    try {
      const deduped = deduplicateCustomerArray(customers);
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(deduped));
    } catch (e) {
      console.error(e);
    }
  },
  saveCustomer(customer: Customer): Customer {
    const list = this.getCustomers();
    const cleanPhone = normalizePhoneNumber(customer.phone);
    const cleanName = normalizeCustomerName(customer.name);
    const isAnon = isAnonymousCustomerName(customer.name);

    const index = list.findIndex((c) => {
      if (c.id && customer.id && c.id === customer.id) return true;
      const cPhone = normalizePhoneNumber(c.phone);
      if (cleanPhone.length >= 7 && cPhone.length >= 7 && cleanPhone === cPhone) return true;
      const cName = normalizeCustomerName(c.name);
      if (!isAnon && cleanName && cName && cleanName === cName) {
        return !cPhone || !cleanPhone || cPhone === cleanPhone;
      }
      return false;
    });

    if (index >= 0) {
      const existing = list[index];
      const merged: Customer = {
        ...existing,
        ...customer,
        id: existing.id || customer.id || generateUUID(),
        name:
          (!customer.name || isAnonymousCustomerName(customer.name)) && !isAnonymousCustomerName(existing.name)
            ? existing.name
            : customer.name || existing.name,
        phone: cleanPhone.length === 10 ? cleanPhone : customer.phone || existing.phone || "",
        gender:
          customer.gender && customer.gender !== "unspecified"
            ? customer.gender
            : existing.gender && existing.gender !== "unspecified"
            ? existing.gender
            : "unspecified",
        email: customer.email || existing.email,
        birthday: customer.birthday || existing.birthday,
        anniversary: customer.anniversary || existing.anniversary,
        notes: customer.notes || existing.notes,
        total_visits: Math.max(existing.total_visits || 0, customer.total_visits || 0),
        total_spent: Math.max(existing.total_spent || 0, customer.total_spent || 0),
        last_visit: customer.last_visit || existing.last_visit,
        created_at: existing.created_at || customer.created_at || new Date().toISOString(),
      };
      list[index] = merged;
      this.saveCustomers(list);
      return merged;
    } else {
      const newCustomer: Customer = {
        ...customer,
        id: customer.id || generateUUID(),
        phone: cleanPhone.length === 10 ? cleanPhone : customer.phone || "",
        gender: customer.gender || "unspecified",
        total_visits: customer.total_visits || 1,
        total_spent: customer.total_spent || 0,
        created_at: customer.created_at || new Date().toISOString(),
      };
      list.push(newCustomer);
      this.saveCustomers(list);
      return newCustomer;
    }
  },
  deleteCustomer(id: string): void {
    const list = this.getCustomers();
    const filtered = list.filter((c) => c.id !== id);
    this.saveCustomers(filtered);
  },

  // INVOICES
  getInvoices(): Invoice[] {
    if (typeof window === "undefined") return DEFAULT_INVOICES;
    try {
      const raw = localStorage.getItem(KEYS.INVOICES);
      if (!raw) return DEFAULT_INVOICES;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_INVOICES;
    } catch {
      return DEFAULT_INVOICES;
    }
  },
  saveInvoices(invoices: Invoice[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
    } catch (e) {
      console.error(e);
    }
  },
  createInvoice(invoice: Invoice): Invoice {
    const invoices = this.getInvoices();
    invoices.unshift(invoice);
    this.saveInvoices(invoices);

    // Update customer stats if phone or customer_name exists
    const cleanPhone = normalizePhoneNumber(invoice.customer_phone);
    const cleanName = normalizeCustomerName(invoice.customer_name);
    const isAnon = isAnonymousCustomerName(invoice.customer_name);

    if (cleanPhone || (!isAnon && cleanName)) {
      const customers = this.getCustomers();
      const existing = customers.find((c) => {
        const cPhone = normalizePhoneNumber(c.phone);
        if (cleanPhone.length >= 7 && cPhone.length >= 7 && cleanPhone === cPhone) return true;
        if (invoice.customer_id && c.id === invoice.customer_id) return true;
        const cName = normalizeCustomerName(c.name);
        if (!isAnon && cleanName && cName && cleanName === cName) {
          return !cPhone || !cleanPhone || cPhone === cleanPhone;
        }
        return false;
      });

      if (existing) {
        existing.total_visits = (existing.total_visits || 0) + 1;
        existing.total_spent = (existing.total_spent || 0) + invoice.grand_total;
        existing.last_visit = invoice.created_at;
        if ((!existing.phone || existing.phone.length < 10) && cleanPhone) {
          existing.phone = cleanPhone;
        }
        if (invoice.customer_name && !isAnon && invoice.customer_name.trim() !== existing.name.trim()) {
          existing.name = invoice.customer_name.trim();
        }
        if (invoice.customer_email && !existing.email) {
          existing.email = invoice.customer_email;
        }
        this.saveCustomers(customers);
      } else if (!isAnon && invoice.customer_name) {
        this.saveCustomer({
          id: invoice.customer_id || generateUUID(),
          name: invoice.customer_name,
          phone: cleanPhone || invoice.customer_phone || "",
          email: invoice.customer_email,
          gender: "unspecified",
          total_visits: 1,
          total_spent: invoice.grand_total,
          last_visit: invoice.created_at,
        });
      }
    }

    return invoice;
  },
  updateInvoice(invoice: Invoice): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === invoice.id);
    if (index !== -1) {
      invoices[index] = invoice;
      this.saveInvoices(invoices);
    }
    return invoice;
  },
  voidInvoice(invoiceId: string): void {
    const invoices = this.getInvoices();
    const target = invoices.find((inv) => inv.id === invoiceId);
    if (target) {
      target.status = "void";
      this.saveInvoices(invoices);
    }
  },
  deleteInvoice(invoiceId: string): void {
    const invoices = this.getInvoices().filter((inv) => inv.id !== invoiceId);
    this.saveInvoices(invoices);
  },

  // EXPENSES
  getExpenses(): Expense[] {
    if (typeof window === "undefined") return DEFAULT_EXPENSES;
    try {
      const raw = localStorage.getItem(KEYS.EXPENSES);
      if (!raw) return DEFAULT_EXPENSES;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_EXPENSES;
    } catch {
      return DEFAULT_EXPENSES;
    }
  },
  saveExpenses(expenses: Expense[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error(e);
    }
  },
  addExpense(expense: Expense): void {
    const list = this.getExpenses();
    list.unshift(expense);
    this.saveExpenses(list);
  },
  deleteExpense(expenseId: string): void {
    const list = this.getExpenses().filter((e) => e.id !== expenseId);
    this.saveExpenses(list);
  },

  // WIPE / FRESH START
  clearAll(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    localStorage.setItem(KEYS.CATALOG, JSON.stringify(DEFAULT_CATALOG));
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
    localStorage.setItem(KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
    localStorage.setItem(KEYS.INITIALIZED, "true");
  },
  resetDemo(): void {
    this.clearAll();
  },
};
