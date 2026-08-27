import { Customer, Invoice, CustomerReminderInfo } from "@/types";
import { normalizePhoneNumber } from "./customerUtils";

/**
 * Checks if a service name represents shaving, beard styling, or short-cycle grooming.
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
 * Analyzes customers and invoices to compute due follow-up reminders.
 * - Grooming / Shave: Overdue if last visit was >= 7 days ago.
 * - Haircut / Spa / Other: Overdue if last visit was >= 30 days ago.
 * - Excludes customers who have visited more recently for any subsequent service.
 */
export function detectCustomerReminders(
  customers: Customer[],
  invoices: Invoice[]
): CustomerReminderInfo[] {
  const reminderList: CustomerReminderInfo[] = [];
  const now = new Date().getTime();

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
    const timeDiff = Math.max(0, now - lastVisitDate.getTime());
    const daysElapsed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // Determine service name and type from latest invoice items
    let hasShaveService = false;
    let serviceNames: string[] = [];

    if (latestInvoice && latestInvoice.items && latestInvoice.items.length > 0) {
      latestInvoice.items.forEach((it) => {
        if (it.item_type === "package" && it.package_services) {
          it.package_services.forEach((ps) => {
            if (isGroomingOrShaveService(ps.service_name)) {
              hasShaveService = true;
            }
            serviceNames.push(ps.service_name);
          });
        } else {
          if (isGroomingOrShaveService(it.item_name)) {
            hasShaveService = true;
          }
          serviceNames.push(it.item_name);
        }
      });
    }

    // Default primary service name
    let primaryServiceName = "Hair & Grooming Service";
    if (serviceNames.length > 0) {
      if (serviceNames.length === 1) {
        primaryServiceName = serviceNames[0];
      } else if (serviceNames.length === 2) {
        primaryServiceName = `${serviceNames[0]} & ${serviceNames[1]}`;
      } else {
        primaryServiceName = `${serviceNames[0]} (+${serviceNames.length - 1} services)`;
      }
    } else if (hasShaveService) {
      primaryServiceName = "Shaving & Grooming";
    } else {
      primaryServiceName = "Haircut & Styling";
    }

    const serviceType = hasShaveService ? "grooming_shave" : "haircut_spa";
    const intervalDays = hasShaveService ? 7 : 30;
    const isOverdue = daysElapsed >= intervalDays;
    const overdueDays = Math.max(0, daysElapsed - intervalDays);
    const reminderSentToday = wasReminderSentToday(cust.last_reminder_sent_at);

    reminderList.push({
      customer: cust,
      lastVisitDate: lastVisitDateStr,
      daysElapsed,
      serviceName: primaryServiceName,
      serviceType,
      intervalDays,
      isOverdue,
      overdueDays,
      lastReminderSentAt: cust.last_reminder_sent_at,
      reminderSentToday,
    });
  });

  // Sort: Overdue first (highest overdue days), then by most days elapsed
  return reminderList.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return b.daysElapsed - a.daysElapsed;
  });
}

/**
 * Formats a clean WhatsApp click-to-chat URL with a dynamic, personalized message.
 */
export function generateWhatsAppReminderUrl(
  customer: Customer,
  info: CustomerReminderInfo,
  salonName: string = "Belezia Salon"
): string {
  const cleanPhone = normalizePhoneNumber(customer.phone);
  const daysText = info.daysElapsed === 1 ? "1 day" : `${info.daysElapsed} days`;
  const serviceName = info.serviceName || "service";
  const customerName = customer.name || "there";

  const message = `Hi ${customerName}, it's been ${daysText} since your last ${serviceName} at ${salonName}! Time for a fresh look. Reply to this message to book your slot.`;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Formats a clean WhatsApp click-to-chat URL for the Raksha Bandhan special festive offer.
 */
export function generateWhatsAppRakhiOfferUrl(
  customer: Customer,
  salonName: string = "Belezia Salon",
  customMessage?: string
): string {
  const cleanPhone = normalizePhoneNumber(customer.phone);
  const customerName = customer.name || "there";

  const defaultMessage = `🌸 *Happy Raksha Bandhan from ${salonName}!* 🌸\n\nDear ${customerName},\nCelebrate the cherished bond of love & togetherness this festive season with our exclusive salon treat! ✨\n\n🎁 *SPECIAL RAKSHA BANDHAN OFFER:* 🎁\n💅 *Bring your siblings and get FREE NAIL PAINT for both hands!* 💅\n\n📅 *Offer Valid Till:* 31st August 2026\n📍 *Location:* ${salonName}\n\nReply to this message to book your appointment! 💖`;

  const message = customMessage !== undefined ? customMessage : defaultMessage;

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message.trim())}`;
}
