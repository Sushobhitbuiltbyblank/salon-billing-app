import { Customer, Invoice, CustomerReminderInfo } from "@/types";
import { normalizePhoneNumber } from "./customerUtils";

/**
 * Checks if a service name represents shaving, beard styling, or short-cycle grooming.
 * Kept for reference or backward-compatibility.
 */
export function isGroomingOrShaveService(serviceName?: string | null): boolean {
  if (!serviceName) return false;
  const s = serviceName.toLowerCase();
  return (
    s.includes("shave") ||
    s.includes("beard") ||
    s.includes("trim") ||
    s.includes("mustache") ||
    s.includes("moustach") ||
    s.includes("threading") ||
    s.includes("blade") ||
    s.includes("grooming")
  );
}

/**
 * Calculates the next monthly reminder due date (1 calendar month later).
 * If the visit was on the 31st and the next month has fewer days (e.g. 30 days for Sep,
 * or 28/29 for Feb), it clamps to the last day of that month (e.g. 31 Aug -> 30 Sep, 31 Jan -> 28/29 Feb).
 */
export function getNextMonthlyDueDate(lastVisitDate: Date | string): Date {
  const d = new Date(lastVisitDate);
  const day = d.getDate();
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 - 11

  const targetYear = month === 11 ? year + 1 : year;
  const targetMonth = (month + 1) % 12;

  // Day 0 of targetMonth + 1 gives the last day of targetMonth
  const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, maxDaysInTargetMonth);

  // Construct new Date directly to avoid intermediate month-rollover quirks in JS Date
  return new Date(
    targetYear,
    targetMonth,
    targetDay,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  );
}

/**
 * Formats a clean, readable timestamp for reminder logs (e.g. "12:30 PM" if today, or "28 Aug, 12:30 PM").
 */
export function formatReminderTime(timestamp?: string | null): string {
  if (!timestamp) return "";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "";

    const isToday = wasReminderSentToday(timestamp);
    if (isToday) {
      return new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "";
  }
}

/**
 * Detects whether a reminder was sent today based on local calendar date.
 */
export function wasReminderSentToday(timestamp?: string | null): boolean {
  if (!timestamp) return false;
  const reminderDate = new Date(timestamp);
  const today = new Date();
  return (
    reminderDate.getFullYear() === today.getFullYear() &&
    reminderDate.getMonth() === today.getMonth() &&
    reminderDate.getDate() === today.getDate()
  );
}

/**
 * Analyzes customers and invoices to compute due follow-up reminders on a uniform monthly schedule.
 * - Reminder becomes due exactly 1 calendar month after the customer's last visit date.
 * - Month-end visits clamp to the end of the subsequent month (e.g. 31 Aug -> 30 Sep).
 * - Excludes customers who have visited more recently for any subsequent service.
 */
export function detectCustomerReminders(
  customers: Customer[],
  invoices: Invoice[]
): CustomerReminderInfo[] {
  const reminderList: CustomerReminderInfo[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  customers.forEach((cust) => {
    const custPhone = normalizePhoneNumber(cust.phone);
    if (!custPhone || custPhone.length < 7) return;

    // Find all non-void invoices for this customer
    const custInvoices = (invoices || []).filter((inv) => {
      if (inv.status === "void" || (inv.status as string) === "cancelled") return false;
      const invPhone = normalizePhoneNumber(inv.customer_phone);
      if (custPhone.length >= 7 && invPhone.length >= 7) {
        return custPhone === invPhone;
      }
      if (cust.id && inv.customer_id) {
        return cust.id === inv.customer_id;
      }
      return false;
    });

    // Sort to get latest invoice (most recent visit)
    custInvoices.sort((a, b) => {
      const dateA = new Date(a.created_at || "").getTime();
      const dateB = new Date(b.created_at || "").getTime();
      return dateB - dateA;
    });

    const latestInvoice = custInvoices[0];

    // Determine latest visit date
    let lastVisitDateStr = cust.last_visit || cust.created_at || new Date().toISOString();
    if (latestInvoice && latestInvoice.created_at) {
      lastVisitDateStr = latestInvoice.created_at;
    }

    const lastVisitDate = new Date(lastVisitDateStr);
    const timeDiff = Math.max(0, now.getTime() - lastVisitDate.getTime());
    const daysElapsed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // Calculate next monthly due date
    const dueDate = getNextMonthlyDueDate(lastVisitDate);
    const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();

    // Overdue when current date is on or after the monthly due date
    const isOverdue = todayStart >= dueStart;
    const overdueDays = isOverdue ? Math.floor((todayStart - dueStart) / (1000 * 60 * 60 * 24)) : 0;
    const reminderSentToday = wasReminderSentToday(cust.last_reminder_sent_at);

    // Extract primary service name from latest invoice items for personalized display
    const serviceNames: string[] = [];

    if (latestInvoice && latestInvoice.items && latestInvoice.items.length > 0) {
      latestInvoice.items.forEach((it) => {
        if (it.item_type === "package" && it.package_services) {
          it.package_services.forEach((ps) => {
            serviceNames.push(ps.service_name);
          });
        } else {
          serviceNames.push(it.item_name);
        }
      });
    }

    let primaryServiceName = "Salon Service";
    if (serviceNames.length > 0) {
      if (serviceNames.length === 1) {
        primaryServiceName = serviceNames[0];
      } else if (serviceNames.length === 2) {
        primaryServiceName = `${serviceNames[0]} & ${serviceNames[1]}`;
      } else {
        primaryServiceName = `${serviceNames[0]} (+${serviceNames.length - 1} services)`;
      }
    }

    reminderList.push({
      customer: cust,
      lastVisitDate: lastVisitDateStr,
      dueDate: dueDate.toISOString(),
      daysElapsed,
      serviceName: primaryServiceName,
      serviceType: "monthly",
      intervalDays: 30,
      isOverdue,
      overdueDays,
      lastReminderSentAt: cust.last_reminder_sent_at,
      reminderSentToday,
      reminderHistory: cust.reminder_history || [],
    });
  });

  // Sort:
  // 1. Overdue and Pending (not sent today) first, sorted by highest overdue days
  // 2. Overdue and Sent today, sorted by highest overdue days
  // 3. Not overdue, sorted by days elapsed
  return reminderList.sort((a, b) => {
    const aPending = a.isOverdue && !a.reminderSentToday;
    const bPending = b.isOverdue && !b.reminderSentToday;
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;

    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    return b.daysElapsed - a.daysElapsed;
  });
}

/**
 * Formats a clean WhatsApp click-to-chat URL with the Free Face De-Tan promotional offer.
 */
export function generateWhatsAppReminderUrl(
  customer: Customer,
  info?: CustomerReminderInfo,
  salonName: string = "belezia Salon, Laxmi Nagar"
): string {
  const cleanPhone = normalizePhoneNumber(customer.phone);
  const customerName = customer.name?.trim() || "there";

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  const expiryDateStr = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(expiry);

  const salonDisplay = salonName.toLowerCase().includes("laxmi nagar")
    ? salonName
    : `${salonName}, Laxmi Nagar`;

  const message = `GET FACE DE-TAN ABSOLUTELY FREE
Free DeTan Offer valid till ${expiryDateStr} on showing this message;

Hi ${customerName}, Its been long since you took any services at ${salonDisplay}.

Time for a fresh service and get a face detan absolutely free.`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}
