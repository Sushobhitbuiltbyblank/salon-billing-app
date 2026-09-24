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

export const REMINDER_COOLDOWN_DAYS = 30;

/**
 * Checks if a reminder was sent within the 30-day cooldown period.
 * When in cooldown, the customer is suppressed from the "Pending" reminder list.
 */
export function isReminderInCooldown(
  timestamp?: string | null,
  cooldownDays: number = REMINDER_COOLDOWN_DAYS
): boolean {
  if (!timestamp) return false;
  const reminderDate = new Date(timestamp);
  if (isNaN(reminderDate.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - reminderDate.getTime();
  if (diffMs < 0) return true; // Sent today / clock discrepancy

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays < cooldownDays;
}

/**
 * Returns the number of remaining days in the cooldown period (0 to cooldownDays).
 */
export function getDaysRemainingInCooldown(
  timestamp?: string | null,
  cooldownDays: number = REMINDER_COOLDOWN_DAYS
): number {
  if (!timestamp) return 0;
  const reminderDate = new Date(timestamp);
  if (isNaN(reminderDate.getTime())) return 0;

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = cooldownDays - diffDays;
  return remaining > 0 ? remaining : 0;
}

/**
 * Detects whether a customer has visited the salon after the last reminder was sent.
 * When true, the previous reminder follow-up cycle is completed, and the cooldown is cleared
 * for their new upcoming cycle.
 */
export function hasCustomerVisitedSinceReminder(
  lastVisitDate?: string | Date | null,
  lastReminderSentAt?: string | null
): boolean {
  if (!lastVisitDate || !lastReminderSentAt) return false;
  const visitTime = new Date(lastVisitDate).getTime();
  const reminderTime = new Date(lastReminderSentAt).getTime();
  if (isNaN(visitTime) || isNaN(reminderTime)) return false;

  // Visit occurred after the reminder was sent
  if (visitTime > reminderTime) return true;

  const visitDate = new Date(lastVisitDate);
  const reminderDate = new Date(lastReminderSentAt);
  const visitDay = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate()).getTime();
  const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate()).getTime();

  return visitDay > reminderDay;
}

/**
 * Formats a clean, user-friendly label for reminder cooldown status.
 * e.g., "Sent Today" or "Sent Yesterday • 29d cooldown" or "Sent 4d ago • 26d cooldown"
 */
export function formatReminderCooldownStatus(
  timestamp?: string | null,
  cooldownDays: number = REMINDER_COOLDOWN_DAYS
): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";

  if (wasReminderSentToday(timestamp)) {
    return "Sent Today";
  }

  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = Math.max(0, cooldownDays - daysAgo);

  if (daysAgo === 1) {
    return remaining > 0 ? `Sent Yesterday • ${remaining}d cooldown` : "Sent Yesterday";
  }
  if (daysAgo > 1) {
    return remaining > 0 ? `Sent ${daysAgo}d ago • ${remaining}d cooldown` : `Sent ${daysAgo}d ago`;
  }
  return `Sent on ${formatReminderTime(timestamp)}`;
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
 * Analyzes customers and invoices to compute due follow-up reminders on a uniform monthly schedule
 * with a 30-day cooldown after any reminder is sent.
 * - Reminder becomes due exactly 1 calendar month after the customer's last visit date.
 * - Month-end visits clamp to the end of the subsequent month (e.g. 31 Aug -> 30 Sep).
 * - Excludes customers who have visited more recently for any subsequent service.
 * - Suppresses customers who have received a reminder within the 30-day cooldown window.
 * - Automatically resets cooldown and starts fresh 1-month cycle when customer visits salon.
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
    
    // Check if customer visited AFTER the last reminder was sent
    const hasVisitedSinceReminder = hasCustomerVisitedSinceReminder(
      lastVisitDateStr,
      cust.last_reminder_sent_at
    );

    // If customer has visited since reminder, cooldown is completed/cleared for the new cycle
    const inCooldown = !hasVisitedSinceReminder && isReminderInCooldown(cust.last_reminder_sent_at, REMINDER_COOLDOWN_DAYS);
    const cooldownRemainingDays = hasVisitedSinceReminder
      ? 0
      : getDaysRemainingInCooldown(cust.last_reminder_sent_at, REMINDER_COOLDOWN_DAYS);
    const reminderSentToday = !hasVisitedSinceReminder && wasReminderSentToday(cust.last_reminder_sent_at);

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
      inCooldown,
      cooldownRemainingDays,
      hasVisitedSinceReminder,
      reminderHistory: cust.reminder_history || [],
    });
  });

  // Sort:
  // 1. Overdue and Pending (action needed: not in cooldown) first, sorted by highest overdue days
  // 2. Overdue and in Cooldown (already sent within 30 days), sorted by highest overdue days
  // 3. Not overdue, sorted by days elapsed
  return reminderList.sort((a, b) => {
    const aPending = a.isOverdue && !a.inCooldown;
    const bPending = b.isOverdue && !b.inCooldown;
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;

    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    return b.daysElapsed - a.daysElapsed;
  });
}

/**
 * Formats a clean WhatsApp click-to-chat URL with the Free Face De-Tan promotional offer,
 * with Google Review and Instagram profile links.
 */
export function generateWhatsAppReminderUrl(
  customer: Customer,
  info?: CustomerReminderInfo,
  salonOrSettings?: string | SalonSettings,
  optionalSettings?: SalonSettings | null
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

  let salonName = "Belezia Salon, Laxmi Nagar";
  let reviewLink = "https://g.page/r/CbGd_cwnL9zrEBM/review";
  let instaLink = "https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr";

  if (typeof salonOrSettings === "object" && salonOrSettings !== null) {
    if (salonOrSettings.salon_name) salonName = salonOrSettings.salon_name;
    if (salonOrSettings.google_review_url) reviewLink = salonOrSettings.google_review_url;
    if (salonOrSettings.instagram_url) instaLink = salonOrSettings.instagram_url;
  } else if (typeof salonOrSettings === "string" && salonOrSettings.trim()) {
    salonName = salonOrSettings.trim();
    if (optionalSettings?.google_review_url) reviewLink = optionalSettings.google_review_url;
    if (optionalSettings?.instagram_url) instaLink = optionalSettings.instagram_url;
  }

  const salonDisplay = salonName.toLowerCase().includes("laxmi nagar")
    ? salonName
    : `${salonName}, Laxmi Nagar`;

  let linksBlock = "";
  if (reviewLink) {
    linksBlock += `\n\n🌟 *Google Review (Rate us 5-Stars):*\n${reviewLink}`;
  }
  if (instaLink) {
    linksBlock += `\n\n📸 *Follow us on Instagram:*\n${instaLink}`;
  }

  const message = `✨ *GET FACE DE-TAN ABSOLUTELY FREE* 🎁
⏳ Free DeTan Offer valid till ${expiryDateStr} on showing this message

👋 Hi ${customerName}, Its been long since you took any services at ${salonDisplay}.

💆 Time for a fresh service and get a face detan absolutely free. ✨${linksBlock}`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}
