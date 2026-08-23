export type StaffStatus = 'active' | 'on_leave' | 'inactive';
export type ItemType = 'service' | 'product' | 'package';
export type PaymentMode = 'cash' | 'card' | 'upi' | 'split';
export type InvoiceStatus = 'paid' | 'pending' | 'void';
export type DiscountType = 'flat' | 'percentage';
export type UserRole = 'admin' | 'receptionist';
export type AppTab = 'pos' | 'customers' | 'dashboard' | 'staff' | 'expenses' | 'history' | 'admin' | 'settings';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pin: string; // 4-digit numeric PIN
  avatar_color: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
}

export type IncentiveType = 'percent' | 'fixed';

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  role: string;
  commission_rate: number; // e.g. 15 for 15% or 150 for ₹150 flat per service
  commission_type?: IncentiveType; // 'percent' (default) or 'fixed'
  product_commission_rate?: number; // e.g. 10 for 10% or 100 for ₹100 flat per product
  product_commission_type?: IncentiveType; // 'percent' (default) or 'fixed'
  status: StaffStatus;
  color?: string;
  notes?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  type: ItemType;
  icon?: string;
  created_at?: string;
}

export interface CatalogItem {
  id: string;
  category_id?: string;
  name: string;
  type: ItemType;
  price: number;
  duration_mins?: number;
  cost_price?: number;
  sku?: string;
  stock_qty?: number;
  package_service_ids?: string[]; // Included service item IDs for combos/packages
  package_regular_price?: number; // Original unbundled total price
  is_active?: boolean;
  created_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: 'female' | 'male' | 'other' | 'unspecified';
  birthday?: string;
  anniversary?: string;
  total_visits: number;
  total_spent: number;
  last_visit?: string;
  notes?: string;
  created_at?: string;
}

export interface PackageServiceItem {
  service_id: string;
  service_name: string;
  price: number; // custom / allocated service amount in this package
  regular_price?: number;
  duration_mins?: number;
  primary_staff_id?: string;
  secondary_staff_id?: string;
  primary_split_ratio?: number;
  secondary_split_ratio?: number;
}

export interface InvoiceItem {
  id: string;
  item_id?: string;
  item_name: string;
  item_type: ItemType;
  quantity: number;
  unit_price: number;
  discount: number; // Discount per item
  total_price: number;
  
  // Package / Combo details
  package_service_ids?: string[];
  package_regular_price?: number;
  package_services?: PackageServiceItem[];

  // Split Staff Assignment
  primary_staff_id?: string;
  secondary_staff_id?: string;
  primary_split_ratio: number; // e.g. 100 or 50 or 60
  secondary_split_ratio: number; // e.g. 0 or 50 or 40
  
  notes?: string;
}

export interface PaymentBreakdown {
  cash?: number;
  card?: number;
  upi?: number;
  other?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  discount_amount: number;
  discount_type: DiscountType;
  discount_value: number;
  tax_amount: number;
  tax_rate: number;
  grand_total: number;
  payment_mode: PaymentMode;
  payment_breakdown?: PaymentBreakdown;
  status: InvoiceStatus;
  notes?: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  payment_mode: string;
  description?: string;
  expense_date: string;
  logged_by?: string;
  created_at?: string;
}

export interface SalonSettings {
  id: string;
  salon_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gst_number: string;
  currency_symbol: string;
  currency_code: string;
  upi_id: string;
  google_review_url: string;
  instagram_url: string;
  thermal_width: '80mm' | '58mm';
  tax_rate: number;
  tax_enabled: boolean;
  invoice_prefix: string;
}

export interface StaffPerformanceSummary {
  staff: Staff;
  services_count: number;
  products_count: number;
  total_sales_generated: number;
  total_commission_earned: number;
  invoices_count: number;
}
