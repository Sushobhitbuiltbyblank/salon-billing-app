import { Invoice } from "@/types";

export interface SalesDataPoint {
  key: string; // unique key, e.g. '2026-09-01' or '2026-09'
  label: string; // e.g. "Mon, 1 Sep" or "1 Sep" or "Sep 2026"
  shortLabel: string; // e.g. "Mon" or "1" or "Sep"
  fullDateStr: string;
  totalSales: number;
  subtotal: number;
  discount: number;
  tax: number;
  invoiceCount: number;
  paymentBreakdown: {
    cash: number;
    upi: number;
    card: number;
    split: number;
  };
  isCurrent: boolean; // isToday or isCurrentMonth
  isFuture: boolean;
}

export interface PeriodicSalesSummary {
  periodType: "week" | "month" | "year";
  periodTitle: string;
  dateRangeLabel: string;
  totalSales: number;
  totalInvoices: number;
  averageSales: number;
  activeDaysCount: number;
  peakPoint: SalesDataPoint | null;
  lowestActivePoint: SalesDataPoint | null;
  dataPoints: SalesDataPoint[];
}

/**
 * Filter non-void valid invoices
 */
export function getValidInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter((inv) => inv && inv.status !== "void");
}

/**
 * Aggregates day-wise sales for the current calendar week (Monday to Sunday)
 */
export function getWeekDayWiseSales(
  invoices: Invoice[],
  referenceDate: Date = new Date()
): PeriodicSalesSummary {
  const validInvoices = getValidInvoices(invoices);
  const now = new Date(referenceDate);

  // Monday-based week calculation (0 = Mon, 6 = Sun)
  const currentDayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const dataPoints: SalesDataPoint[] = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0).getTime();
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999).getTime();

    const isToday =
      dayDate.getFullYear() === now.getFullYear() &&
      dayDate.getMonth() === now.getMonth() &&
      dayDate.getDate() === now.getDate();

    const isFuture = dayStart > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    // Filter invoices for this day
    const dayInvoices = validInvoices.filter((inv) => {
      const t = new Date(inv.created_at).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    const totalSales = dayInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const subtotal = dayInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);
    const discount = dayInvoices.reduce((sum, inv) => sum + (Number(inv.discount_amount) || 0), 0);
    const tax = dayInvoices.reduce((sum, inv) => sum + (Number(inv.tax_amount) || 0), 0);

    const paymentBreakdown = { cash: 0, upi: 0, card: 0, split: 0 };
    dayInvoices.forEach((inv) => {
      if (paymentBreakdown[inv.payment_mode] !== undefined) {
        paymentBreakdown[inv.payment_mode] += Number(inv.grand_total) || 0;
      }
    });

    const monthName = dayDate.toLocaleString("en-IN", { month: "short" });
    const formattedLabel = `${dayNames[i]}, ${dayDate.getDate()} ${monthName}`;
    const fullDateStr = dayDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    dataPoints.push({
      key: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`,
      label: formattedLabel,
      shortLabel: dayNames[i],
      fullDateStr,
      totalSales,
      subtotal,
      discount,
      tax,
      invoiceCount: dayInvoices.length,
      paymentBreakdown,
      isCurrent: isToday,
      isFuture,
    });
  }

  const totalSales = dataPoints.reduce((s, p) => s + p.totalSales, 0);
  const totalInvoices = dataPoints.reduce((s, p) => s + p.invoiceCount, 0);
  const activeDays = dataPoints.filter((p) => p.totalSales > 0);
  // Average across elapsed days (or active days if none elapsed yet)
  const elapsedDays = dataPoints.filter((p) => !p.isFuture).length || 1;
  const averageSales = Math.round(totalSales / elapsedDays);

  const peakPoint = [...dataPoints].sort((a, b) => b.totalSales - a.totalSales)[0] || null;
  const lowestActivePoint = activeDays.length > 0 ? [...activeDays].sort((a, b) => a.totalSales - b.totalSales)[0] : null;

  const startStr = monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const endStr = sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return {
    periodType: "week",
    periodTitle: "This Week's Daily Sales",
    dateRangeLabel: `${startStr} – ${endStr}`,
    totalSales,
    totalInvoices,
    averageSales,
    activeDaysCount: activeDays.length,
    peakPoint: peakPoint && peakPoint.totalSales > 0 ? peakPoint : null,
    lowestActivePoint,
    dataPoints,
  };
}

/**
 * Aggregates day-wise sales for the current calendar month (Day 1 to Last Day)
 */
export function getMonthDayWiseSales(
  invoices: Invoice[],
  referenceDate: Date = new Date()
): PeriodicSalesSummary {
  const validInvoices = getValidInvoices(invoices);
  const now = new Date(referenceDate);
  const year = now.getFullYear();
  const month = now.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("en-IN", { month: "long" });

  const dataPoints: SalesDataPoint[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dayStart = new Date(year, month, day, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(year, month, day, 23, 59, 59, 999).getTime();

    const isToday =
      dayDate.getFullYear() === now.getFullYear() &&
      dayDate.getMonth() === now.getMonth() &&
      dayDate.getDate() === now.getDate();

    const isFuture = dayStart > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const dayInvoices = validInvoices.filter((inv) => {
      const t = new Date(inv.created_at).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    const totalSales = dayInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const subtotal = dayInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);
    const discount = dayInvoices.reduce((sum, inv) => sum + (Number(inv.discount_amount) || 0), 0);
    const tax = dayInvoices.reduce((sum, inv) => sum + (Number(inv.tax_amount) || 0), 0);

    const paymentBreakdown = { cash: 0, upi: 0, card: 0, split: 0 };
    dayInvoices.forEach((inv) => {
      if (paymentBreakdown[inv.payment_mode] !== undefined) {
        paymentBreakdown[inv.payment_mode] += Number(inv.grand_total) || 0;
      }
    });

    const weekdayShort = dayDate.toLocaleString("en-IN", { weekday: "short" });
    const formattedLabel = `${day} ${monthName.slice(0, 3)} (${weekdayShort})`;
    const fullDateStr = dayDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    dataPoints.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: formattedLabel,
      shortLabel: `${day}`,
      fullDateStr,
      totalSales,
      subtotal,
      discount,
      tax,
      invoiceCount: dayInvoices.length,
      paymentBreakdown,
      isCurrent: isToday,
      isFuture,
    });
  }

  const totalSales = dataPoints.reduce((s, p) => s + p.totalSales, 0);
  const totalInvoices = dataPoints.reduce((s, p) => s + p.invoiceCount, 0);
  const activeDays = dataPoints.filter((p) => p.totalSales > 0);
  const elapsedDays = Math.min(now.getDate(), daysInMonth);
  const averageSales = Math.round(totalSales / (elapsedDays || 1));

  const peakPoint = [...dataPoints].sort((a, b) => b.totalSales - a.totalSales)[0] || null;
  const lowestActivePoint = activeDays.length > 0 ? [...activeDays].sort((a, b) => a.totalSales - b.totalSales)[0] : null;

  return {
    periodType: "month",
    periodTitle: "This Month's Daily Sales",
    dateRangeLabel: `${monthName} ${year} (1 – ${daysInMonth})`,
    totalSales,
    totalInvoices,
    averageSales,
    activeDaysCount: activeDays.length,
    peakPoint: peakPoint && peakPoint.totalSales > 0 ? peakPoint : null,
    lowestActivePoint,
    dataPoints,
  };
}

/**
 * Aggregates month-wise sales for the current calendar year (Jan to Dec)
 */
export function getYearMonthWiseSales(
  invoices: Invoice[],
  referenceDate: Date = new Date()
): PeriodicSalesSummary {
  const validInvoices = getValidInvoices(invoices);
  const now = new Date(referenceDate);
  const year = now.getFullYear();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const fullMonthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dataPoints: SalesDataPoint[] = [];

  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(year, m, 1, 0, 0, 0, 0).getTime();
    const monthEnd = new Date(year, m + 1, 0, 23, 59, 59, 999).getTime();

    const isCurrentMonth = year === now.getFullYear() && m === now.getMonth();
    const isFuture = year === now.getFullYear() && m > now.getMonth();

    const monthInvoices = validInvoices.filter((inv) => {
      const t = new Date(inv.created_at).getTime();
      return t >= monthStart && t <= monthEnd;
    });

    const totalSales = monthInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const subtotal = monthInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);
    const discount = monthInvoices.reduce((sum, inv) => sum + (Number(inv.discount_amount) || 0), 0);
    const tax = monthInvoices.reduce((sum, inv) => sum + (Number(inv.tax_amount) || 0), 0);

    const paymentBreakdown = { cash: 0, upi: 0, card: 0, split: 0 };
    monthInvoices.forEach((inv) => {
      if (paymentBreakdown[inv.payment_mode] !== undefined) {
        paymentBreakdown[inv.payment_mode] += Number(inv.grand_total) || 0;
      }
    });

    const formattedLabel = `${fullMonthNames[m]} ${year}`;
    const fullDateStr = `${fullMonthNames[m]} ${year}`;

    dataPoints.push({
      key: `${year}-${String(m + 1).padStart(2, "0")}`,
      label: formattedLabel,
      shortLabel: monthNames[m],
      fullDateStr,
      totalSales,
      subtotal,
      discount,
      tax,
      invoiceCount: monthInvoices.length,
      paymentBreakdown,
      isCurrent: isCurrentMonth,
      isFuture,
    });
  }

  const totalSales = dataPoints.reduce((s, p) => s + p.totalSales, 0);
  const totalInvoices = dataPoints.reduce((s, p) => s + p.invoiceCount, 0);
  const activeMonths = dataPoints.filter((p) => p.totalSales > 0);
  const elapsedMonths = now.getMonth() + 1;
  const averageSales = Math.round(totalSales / (elapsedMonths || 1));

  const peakPoint = [...dataPoints].sort((a, b) => b.totalSales - a.totalSales)[0] || null;
  const lowestActivePoint = activeMonths.length > 0 ? [...activeMonths].sort((a, b) => a.totalSales - b.totalSales)[0] : null;

  return {
    periodType: "year",
    periodTitle: "This Year's Monthly Sales",
    dateRangeLabel: `Calendar Year ${year} (Jan – Dec)`,
    totalSales,
    totalInvoices,
    averageSales,
    activeDaysCount: activeMonths.length,
    peakPoint: peakPoint && peakPoint.totalSales > 0 ? peakPoint : null,
    lowestActivePoint,
    dataPoints,
  };
}
