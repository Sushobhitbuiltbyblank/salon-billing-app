import { describe, it, expect } from "vitest";
import {
  getWeekDayWiseSales,
  getMonthDayWiseSales,
  getYearMonthWiseSales,
} from "@/lib/salesAnalytics";
import { Invoice } from "@/types";

describe("salesAnalytics tests", () => {
  const createMockInvoice = (id: string, dateStr: string, total: number, status: "paid" | "void" = "paid", mode: "cash" | "upi" | "card" | "split" = "upi"): Invoice => ({
    id,
    invoice_number: `BZ-${id}`,
    customer_name: `Customer ${id}`,
    subtotal: total,
    discount_amount: 0,
    discount_type: "flat",
    discount_value: 0,
    tax_amount: 0,
    tax_rate: 0,
    grand_total: total,
    payment_mode: mode,
    status,
    created_at: dateStr,
    items: [],
  });

  // Reference date: Saturday, 5 Sep 2026
  // Monday of that week: 31 Aug 2026
  // Sunday of that week: 6 Sep 2026
  const refDate = new Date("2026-09-05T14:30:00");

  it("should correctly aggregate day-wise sales for this week", () => {
    const invoices: Invoice[] = [
      // Monday 31 Aug 2026
      createMockInvoice("1", "2026-08-31T10:00:00", 1200, "paid", "upi"),
      // Wednesday 2 Sep 2026
      createMockInvoice("2", "2026-09-02T15:00:00", 2500, "paid", "cash"),
      // Saturday 5 Sep 2026 (Today)
      createMockInvoice("3", "2026-09-05T11:00:00", 4000, "paid", "card"),
      createMockInvoice("4", "2026-09-05T16:00:00", 1500, "paid", "split"),
      // Voided invoice on Saturday - should be ignored
      createMockInvoice("5", "2026-09-05T18:00:00", 5000, "void", "upi"),
      // Past week invoice (Sunday 30 Aug 2026) - should be excluded from this week
      createMockInvoice("6", "2026-08-30T12:00:00", 9999, "paid", "cash"),
    ];

    const weekData = getWeekDayWiseSales(invoices, refDate);

    expect(weekData.periodType).toBe("week");
    expect(weekData.dataPoints).toHaveLength(7);

    // Mon = 1200, Wed = 2500, Sat = 5500. Total = 9200
    expect(weekData.totalSales).toBe(9200);
    expect(weekData.totalInvoices).toBe(4);
    expect(weekData.activeDaysCount).toBe(3);

    // Check Monday
    expect(weekData.dataPoints[0].totalSales).toBe(1200);
    expect(weekData.dataPoints[0].shortLabel).toBe("Mon");

    // Check Wednesday
    expect(weekData.dataPoints[2].totalSales).toBe(2500);

    // Check Saturday (index 5)
    expect(weekData.dataPoints[5].totalSales).toBe(5500);
    expect(weekData.dataPoints[5].invoiceCount).toBe(2);
    expect(weekData.dataPoints[5].paymentBreakdown.card).toBe(4000);
    expect(weekData.dataPoints[5].paymentBreakdown.split).toBe(1500);
    expect(weekData.dataPoints[5].isCurrent).toBe(true);

    // Check Sunday (index 6, future day relative to Saturday noon)
    expect(weekData.dataPoints[6].isFuture).toBe(true);

    // Check Peak
    expect(weekData.peakPoint?.totalSales).toBe(5500);
    expect(weekData.peakPoint?.shortLabel).toBe("Sat");
  });

  it("should correctly aggregate day-wise sales for this month", () => {
    const invoices: Invoice[] = [
      // 1 Sep 2026
      createMockInvoice("m1", "2026-09-01T10:00:00", 3000, "paid", "upi"),
      // 5 Sep 2026 (Today)
      createMockInvoice("m2", "2026-09-05T12:00:00", 7000, "paid", "card"),
      // Previous month 31 Aug 2026 - should not be in Sept
      createMockInvoice("m3", "2026-08-31T23:00:00", 5000, "paid", "cash"),
    ];

    const monthData = getMonthDayWiseSales(invoices, refDate);

    expect(monthData.periodType).toBe("month");
    // September has 30 days
    expect(monthData.dataPoints).toHaveLength(30);

    expect(monthData.totalSales).toBe(10000);
    expect(monthData.totalInvoices).toBe(2);
    expect(monthData.activeDaysCount).toBe(2);

    // Day 1
    expect(monthData.dataPoints[0].totalSales).toBe(3000);
    expect(monthData.dataPoints[0].shortLabel).toBe("1");

    // Day 5 (Today)
    expect(monthData.dataPoints[4].totalSales).toBe(7000);
    expect(monthData.dataPoints[4].isCurrent).toBe(true);

    // Day 6 is future
    expect(monthData.dataPoints[5].isFuture).toBe(true);

    // Peak
    expect(monthData.peakPoint?.totalSales).toBe(7000);
    expect(monthData.peakPoint?.shortLabel).toBe("5");
  });

  it("should correctly aggregate month-wise sales for this year", () => {
    const invoices: Invoice[] = [
      // January 2026
      createMockInvoice("y1", "2026-01-15T11:00:00", 25000, "paid", "upi"),
      // March 2026
      createMockInvoice("y2", "2026-03-20T14:00:00", 40000, "paid", "cash"),
      // September 2026 (Current month)
      createMockInvoice("y3", "2026-09-05T12:00:00", 50000, "paid", "card"),
      // Previous year 2025 - should be excluded
      createMockInvoice("y4", "2025-12-31T20:00:00", 80000, "paid", "upi"),
    ];

    const yearData = getYearMonthWiseSales(invoices, refDate);

    expect(yearData.periodType).toBe("year");
    expect(yearData.dataPoints).toHaveLength(12);

    // Total = 25000 + 40000 + 50000 = 115000
    expect(yearData.totalSales).toBe(115000);
    expect(yearData.totalInvoices).toBe(3);
    expect(yearData.activeDaysCount).toBe(3);

    // Jan (index 0)
    expect(yearData.dataPoints[0].shortLabel).toBe("Jan");
    expect(yearData.dataPoints[0].totalSales).toBe(25000);

    // Mar (index 2)
    expect(yearData.dataPoints[2].shortLabel).toBe("Mar");
    expect(yearData.dataPoints[2].totalSales).toBe(40000);

    // Sep (index 8, current month)
    expect(yearData.dataPoints[8].shortLabel).toBe("Sep");
    expect(yearData.dataPoints[8].totalSales).toBe(50000);
    expect(yearData.dataPoints[8].isCurrent).toBe(true);

    // Oct (index 9, future month)
    expect(yearData.dataPoints[9].isFuture).toBe(true);

    // Peak
    expect(yearData.peakPoint?.totalSales).toBe(50000);
    expect(yearData.peakPoint?.shortLabel).toBe("Sep");
  });

  it("should correctly aggregate Retail Products Sale scope with discounts subtracted", () => {
    // Invoice 1: Pure service ₹1,000 on Saturday 5 Sep 2026
    const invService: Invoice = {
      id: "p1",
      invoice_number: "BZ-p1",
      customer_name: "Service Customer",
      subtotal: 1000,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 1000,
      payment_mode: "upi",
      status: "paid",
      created_at: "2026-09-05T10:00:00",
      items: [
        {
          id: "it1",
          item_id: "s1",
          item_name: "Hair Cut",
          item_type: "service",
          quantity: 1,
          unit_price: 1000,
          discount: 0,
          total_price: 1000,
        },
      ],
    };

    // Invoice 2: Pure product with discount (e.g. shampoo subtotal ₹2,410 - ₹140 invoice discount = ₹2,270) on Saturday 5 Sep 2026
    const invProduct: Invoice = {
      id: "p2",
      invoice_number: "BZ-p2",
      customer_name: "Product Customer",
      subtotal: 2410,
      discount_amount: 140,
      discount_type: "flat",
      discount_value: 140,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 2270,
      payment_mode: "cash",
      status: "paid",
      created_at: "2026-09-05T14:00:00",
      items: [
        {
          id: "it2",
          item_id: "prod1",
          item_name: "Loreal Shampoo",
          item_type: "product",
          quantity: 2,
          unit_price: 1205,
          discount: 0,
          total_price: 2410,
        },
      ],
    };

    // Invoice 3: Mixed invoice on Wednesday 2 Sep 2026
    // Service: ₹2,000, Product: ₹1,000 (1 unit), Total Subtotal = 3,000, 10% invoice discount (₹300) -> Net Product = 900
    const invMixed: Invoice = {
      id: "p3",
      invoice_number: "BZ-p3",
      customer_name: "Mixed Customer",
      subtotal: 3000,
      discount_amount: 300,
      discount_type: "flat",
      discount_value: 300,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 2700,
      payment_mode: "card",
      status: "paid",
      created_at: "2026-09-02T16:00:00",
      items: [
        {
          id: "it3",
          item_id: "s2",
          item_name: "Facial",
          item_type: "service",
          quantity: 1,
          unit_price: 2000,
          discount: 0,
          total_price: 2000,
        },
        {
          id: "it4",
          item_id: "prod2",
          item_name: "Face Serum",
          item_type: "product",
          quantity: 1,
          unit_price: 1000,
          discount: 0,
          total_price: 1000,
        },
      ],
    };

    const invoices = [invService, invProduct, invMixed];

    // 1. Week breakdown in "product" scope
    const weekProd = getWeekDayWiseSales(invoices, refDate, "product");
    expect(weekProd.saleScope).toBe("product");
    expect(weekProd.periodTitle).toContain("Retail Product Sales");
    // Wed = ₹900, Sat = ₹2,270. Total = ₹3,170 (Service ₹1000 and ₹1800 excluded)
    expect(weekProd.totalSales).toBe(3170);
    // Product units: 1 on Wed + 2 on Sat = 3 units
    expect(weekProd.totalProductUnits).toBe(3);
    // Invoices with products: 1 on Wed + 1 on Sat = 2 bills
    expect(weekProd.totalInvoices).toBe(2);

    // Check Wed data point (index 2)
    expect(weekProd.dataPoints[2].totalSales).toBe(900);
    expect(weekProd.dataPoints[2].productUnits).toBe(1);
    expect(weekProd.dataPoints[2].invoiceCount).toBe(1);
    expect(weekProd.dataPoints[2].paymentBreakdown.card).toBe(900);

    // Check Sat data point (index 5)
    expect(weekProd.dataPoints[5].totalSales).toBe(2270);
    expect(weekProd.dataPoints[5].productUnits).toBe(2);
    expect(weekProd.dataPoints[5].invoiceCount).toBe(1);
    expect(weekProd.dataPoints[5].paymentBreakdown.cash).toBe(2270);

    // 2. Month breakdown in "product" scope
    const monthProd = getMonthDayWiseSales(invoices, refDate, "product");
    expect(monthProd.saleScope).toBe("product");
    expect(monthProd.totalSales).toBe(3170);
    expect(monthProd.totalProductUnits).toBe(3);

    // 3. Year breakdown in "product" scope
    const yearProd = getYearMonthWiseSales(invoices, refDate, "product");
    expect(yearProd.saleScope).toBe("product");
    expect(yearProd.totalSales).toBe(3170);
    expect(yearProd.totalProductUnits).toBe(3);
  });
});
