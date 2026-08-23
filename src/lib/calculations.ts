import { Invoice, InvoiceItem, Staff, StaffPerformanceSummary, DiscountType } from "@/types";

export function calculateItemTotal(
  unitPrice: number,
  quantity: number,
  discount: number = 0
): number {
  const base = Math.max(0, unitPrice) * Math.max(1, quantity);
  return Math.max(0, base - Math.max(0, discount));
}

export function calculateInvoiceTotals(params: {
  items: InvoiceItem[];
  discountType: DiscountType;
  discountValue: number;
  taxEnabled: boolean;
  taxRate: number;
}) {
  const { items, discountType, discountValue, taxEnabled, taxRate } = params;

  // Subtotal = Sum of all line item totals
  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

  // Discount calculation
  let discountAmount = 0;
  if (discountType === "percentage") {
    const pct = Math.min(100, Math.max(0, discountValue));
    discountAmount = (subtotal * pct) / 100;
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }

  // Taxable amount
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Tax calculation
  const taxAmount = taxEnabled ? (taxableAmount * Math.max(0, taxRate)) / 100 : 0;

  // Grand Total rounded to nearest integer / standard currency
  const grandTotal = Math.round(taxableAmount + taxAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
  };
}

export interface LineItemCommission {
  primaryStaffId?: string;
  primaryStaffName?: string;
  primaryCommission: number;
  primarySplitRatio: number;
  primarySalesVolume: number;
  
  secondaryStaffId?: string;
  secondaryStaffName?: string;
  secondaryCommission: number;
  secondarySplitRatio: number;
  secondarySalesVolume: number;
}

export function calculateItemStaffCommissions(
  item: InvoiceItem,
  staffList: Staff[]
): LineItemCommission {
  const primaryStaff = staffList.find((s) => s.id === item.primary_staff_id);
  const secondaryStaff = staffList.find((s) => s.id === item.secondary_staff_id);

  const primaryRatio = item.primary_split_ratio || 100;
  const secondaryRatio = item.secondary_split_ratio || 0;
  const isProduct = item.item_type === "product";

  // Sales Volume allocated to each staff member
  const primarySalesVolume = (item.total_price * primaryRatio) / 100;
  const secondarySalesVolume = (item.total_price * secondaryRatio) / 100;

  // Primary Staff incentive calculation
  let primaryCommission = 0;
  if (primaryStaff) {
    const rate = isProduct
      ? (primaryStaff.product_commission_rate ?? primaryStaff.commission_rate)
      : primaryStaff.commission_rate;
    const type = isProduct
      ? (primaryStaff.product_commission_type ?? primaryStaff.commission_type ?? "percent")
      : (primaryStaff.commission_type ?? "percent");

    if (type === "fixed") {
      // Fixed incentive amount per item multiplied by quantity and split ratio
      primaryCommission = (rate * item.quantity * primaryRatio) / 100;
    } else {
      // Percentage of allocated sales volume
      primaryCommission = (primarySalesVolume * rate) / 100;
    }
  }

  // Secondary Staff incentive calculation
  let secondaryCommission = 0;
  if (secondaryStaff) {
    const rate = isProduct
      ? (secondaryStaff.product_commission_rate ?? secondaryStaff.commission_rate)
      : secondaryStaff.commission_rate;
    const type = isProduct
      ? (secondaryStaff.product_commission_type ?? secondaryStaff.commission_type ?? "percent")
      : (secondaryStaff.commission_type ?? "percent");

    if (type === "fixed") {
      secondaryCommission = (rate * item.quantity * secondaryRatio) / 100;
    } else {
      secondaryCommission = (secondarySalesVolume * rate) / 100;
    }
  }

  return {
    primaryStaffId: primaryStaff?.id,
    primaryStaffName: primaryStaff?.name,
    primaryCommission,
    primarySplitRatio: primaryRatio,
    primarySalesVolume,
    
    secondaryStaffId: secondaryStaff?.id,
    secondaryStaffName: secondaryStaff?.name,
    secondaryCommission,
    secondarySplitRatio: secondaryRatio,
    secondarySalesVolume,
  };
}

export function calculateStaffPerformance(
  invoices: Invoice[],
  staffList: Staff[]
): StaffPerformanceSummary[] {
  const summaryMap = new Map<string, StaffPerformanceSummary>();

  // Initialize for all staff members
  staffList.forEach((staff) => {
    summaryMap.set(staff.id, {
      staff,
      services_count: 0,
      products_count: 0,
      total_sales_generated: 0,
      total_commission_earned: 0,
      invoices_count: 0,
    });
  });

  // Track unique invoice ids per staff to count distinct invoices
  const staffInvoices = new Map<string, Set<string>>();
  staffList.forEach((s) => staffInvoices.set(s.id, new Set()));

  invoices
    .filter((inv) => inv.status !== "void")
    .forEach((invoice) => {
      invoice.items.forEach((item) => {
        const comm = calculateItemStaffCommissions(item, staffList);

        if (comm.primaryStaffId && summaryMap.has(comm.primaryStaffId)) {
          const entry = summaryMap.get(comm.primaryStaffId)!;
          if (item.item_type === "service" || item.item_type === "package") {
            entry.services_count += item.quantity;
          } else {
            entry.products_count += item.quantity;
          }
          entry.total_sales_generated += comm.primarySalesVolume;
          entry.total_commission_earned += comm.primaryCommission;
          staffInvoices.get(comm.primaryStaffId)?.add(invoice.id);
        }

        if (comm.secondaryStaffId && summaryMap.has(comm.secondaryStaffId)) {
          const entry = summaryMap.get(comm.secondaryStaffId)!;
          if (item.item_type === "service" || item.item_type === "package") {
            entry.services_count += item.quantity;
          } else {
            entry.products_count += item.quantity;
          }
          entry.total_sales_generated += comm.secondarySalesVolume;
          entry.total_commission_earned += comm.secondaryCommission;
          staffInvoices.get(comm.secondaryStaffId)?.add(invoice.id);
        }
      });
    });

  // Set invoice counts
  summaryMap.forEach((entry, staffId) => {
    entry.invoices_count = staffInvoices.get(staffId)?.size || 0;
  });

  return Array.from(summaryMap.values()).sort(
    (a, b) => b.total_sales_generated - a.total_sales_generated
  );
}
