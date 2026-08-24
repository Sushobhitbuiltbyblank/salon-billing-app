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

export interface IndividualStaffCommission {
  staffId: string;
  staffName?: string;
  salesVolume: number;
  commission: number;
  ratio: number;
}

export interface LineItemCommission {
  splits: IndividualStaffCommission[];
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
  const isProduct = item.item_type === "product";
  const itemTotal = item.total_price || (item.unit_price * item.quantity);
  const splits: IndividualStaffCommission[] = [];

  if (item.staff_splits && item.staff_splits.length > 0) {
    // Process N-Staff Split Assignments with explicit ₹ amounts
    item.staff_splits.forEach((split) => {
      const staffMember = staffList.find((s) => s.id === split.staff_id);
      const allocatedAmount = Number(split.amount) || 0;
      const ratio = itemTotal > 0 ? (allocatedAmount / itemTotal) * 100 : 0;

      let commission = 0;
      if (staffMember) {
        const rate = isProduct
          ? (staffMember.product_commission_rate ?? staffMember.commission_rate)
          : staffMember.commission_rate;
        const type = isProduct
          ? (staffMember.product_commission_type ?? staffMember.commission_type ?? "percent")
          : (staffMember.commission_type ?? "percent");

        if (type === "fixed") {
          commission = itemTotal > 0 ? (rate * item.quantity * allocatedAmount) / itemTotal : rate * item.quantity;
        } else {
          commission = (allocatedAmount * rate) / 100;
        }
      }

      splits.push({
        staffId: split.staff_id,
        staffName: staffMember?.name || split.staff_name,
        salesVolume: allocatedAmount,
        commission,
        ratio,
      });
    });
  } else {
    // Backwards compatibility with primary and secondary staff
    const primaryStaff = staffList.find((s) => s.id === item.primary_staff_id);
    const secondaryStaff = staffList.find((s) => s.id === item.secondary_staff_id);
    const primaryRatio = item.primary_split_ratio ?? 100;
    const secondaryRatio = item.secondary_split_ratio ?? 0;

    if (primaryStaff) {
      const primarySalesVolume = (itemTotal * primaryRatio) / 100;
      const rate = isProduct
        ? (primaryStaff.product_commission_rate ?? primaryStaff.commission_rate)
        : primaryStaff.commission_rate;
      const type = isProduct
        ? (primaryStaff.product_commission_type ?? primaryStaff.commission_type ?? "percent")
        : (primaryStaff.commission_type ?? "percent");

      const primaryCommission =
        type === "fixed"
          ? (rate * item.quantity * primaryRatio) / 100
          : (primarySalesVolume * rate) / 100;

      splits.push({
        staffId: primaryStaff.id,
        staffName: primaryStaff.name,
        salesVolume: primarySalesVolume,
        commission: primaryCommission,
        ratio: primaryRatio,
      });
    }

    if (secondaryStaff) {
      const secondarySalesVolume = (itemTotal * secondaryRatio) / 100;
      const rate = isProduct
        ? (secondaryStaff.product_commission_rate ?? secondaryStaff.commission_rate)
        : secondaryStaff.commission_rate;
      const type = isProduct
        ? (secondaryStaff.product_commission_type ?? secondaryStaff.commission_type ?? "percent")
        : (secondaryStaff.commission_type ?? "percent");

      const secondaryCommission =
        type === "fixed"
          ? (rate * item.quantity * secondaryRatio) / 100
          : (secondarySalesVolume * rate) / 100;

      splits.push({
        staffId: secondaryStaff.id,
        staffName: secondaryStaff.name,
        salesVolume: secondarySalesVolume,
        commission: secondaryCommission,
        ratio: secondaryRatio,
      });
    }
  }

  const primary = splits[0];
  const secondary = splits[1];

  return {
    splits,
    primaryStaffId: primary?.staffId,
    primaryStaffName: primary?.staffName,
    primaryCommission: primary?.commission || 0,
    primarySplitRatio: primary?.ratio || 100,
    primarySalesVolume: primary?.salesVolume || 0,
    secondaryStaffId: secondary?.staffId,
    secondaryStaffName: secondary?.staffName,
    secondaryCommission: secondary?.commission || 0,
    secondarySplitRatio: secondary?.ratio || 0,
    secondarySalesVolume: secondary?.salesVolume || 0,
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
        // PACKAGE COMBO: CREDIT INDIVIDUAL SERVICES TO RESPECTIVE ASSIGNED STYLISTS
        if (
          item.item_type === "package" &&
          item.package_services &&
          item.package_services.length > 0
        ) {
          item.package_services.forEach((pkgSvc) => {
            if (pkgSvc.staff_splits && pkgSvc.staff_splits.length > 0) {
              pkgSvc.staff_splits.forEach((split) => {
                if (summaryMap.has(split.staff_id)) {
                  const staffMember = staffList.find((s) => s.id === split.staff_id);
                  const entry = summaryMap.get(split.staff_id)!;
                  const svcSales = Number(split.amount) || 0;
                  const totalPkgSvcPrice = (Number(pkgSvc.price) || 0) * (item.quantity || 1);
                  let svcCommission = 0;
                  if (staffMember) {
                    const rate = staffMember.commission_rate;
                    const type = staffMember.commission_type ?? "percent";
                    svcCommission =
                      type === "fixed"
                        ? totalPkgSvcPrice > 0 ? (rate * item.quantity * svcSales) / totalPkgSvcPrice : rate * item.quantity
                        : (svcSales * rate) / 100;
                  }
                  entry.services_count += item.quantity;
                  entry.total_sales_generated += svcSales;
                  entry.total_commission_earned += svcCommission;
                  staffInvoices.get(split.staff_id)?.add(invoice.id);
                }
              });
            } else if (pkgSvc.primary_staff_id && summaryMap.has(pkgSvc.primary_staff_id)) {
              const staffMember = staffList.find((s) => s.id === pkgSvc.primary_staff_id);
              const entry = summaryMap.get(pkgSvc.primary_staff_id)!;
              const svcSales = (Number(pkgSvc.price) || 0) * (item.quantity || 1);

              let svcCommission = 0;
              if (staffMember) {
                const rate = staffMember.commission_rate;
                const type = staffMember.commission_type ?? "percent";
                svcCommission =
                  type === "fixed" ? rate * item.quantity : (svcSales * rate) / 100;
              }

              entry.services_count += item.quantity;
              entry.total_sales_generated += svcSales;
              entry.total_commission_earned += svcCommission;
              staffInvoices.get(pkgSvc.primary_staff_id)?.add(invoice.id);
            }
          });
          return;
        }

        // REGULAR SERVICE / PRODUCT COMMISSIONS (N-STAFF SUPPORT)
        const comm = calculateItemStaffCommissions(item, staffList);
        comm.splits.forEach((split) => {
          if (split.staffId && summaryMap.has(split.staffId)) {
            const entry = summaryMap.get(split.staffId)!;
            if (item.item_type === "service" || item.item_type === "package") {
              entry.services_count += item.quantity;
            } else {
              entry.products_count += item.quantity;
            }
            entry.total_sales_generated += split.salesVolume;
            entry.total_commission_earned += split.commission;
            staffInvoices.get(split.staffId)?.add(invoice.id);
          }
        });
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
