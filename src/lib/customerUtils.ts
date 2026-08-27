import { Customer, Invoice } from "@/types";
import { generateUUID } from "./utils";

/**
 * Normalizes phone numbers by stripping non-digits and keeping the standard 10-digit mobile number.
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normalizes customer names: trims, converts to lowercase, and collapses whitespace.
 */
export function normalizeCustomerName(name?: string | null): string {
  if (!name) return "";
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Checks if a customer name is generic/anonymous (like Walk-in Guest).
 */
export function isAnonymousCustomerName(name?: string | null): boolean {
  const norm = normalizeCustomerName(name);
  if (!norm) return true;
  return (
    norm === "walk-in guest" ||
    norm === "walk in guest" ||
    norm === "walk-in" ||
    norm === "walk in" ||
    norm === "walkin" ||
    norm === "guest" ||
    norm.startsWith("guest (") ||
    norm.startsWith("walk-in (") ||
    norm === "anonymous" ||
    norm === "client"
  );
}

/**
 * Deduplicates an array of Customer objects.
 * Merges duplicate records by Phone or Name while preserving richer details.
 */
export function deduplicateCustomerArray(customers: Customer[]): Customer[] {
  if (!Array.isArray(customers) || customers.length === 0) return [];

  const idMap = new Map<string, Customer>();
  const phoneMap = new Map<string, Customer>();
  const unifiedList: Customer[] = [];

  customers.forEach((cust) => {
    if (!cust) return;
    const cleanPhone = normalizePhoneNumber(cust.phone);
    // STRICT CRM RULE: Only save/keep customers with a valid mobile number (>= 7 digits)
    if (!cleanPhone || cleanPhone.length < 7) return;

    // Match strictly by Phone Number or ID (Never by Name alone)
    let matched: Customer | undefined;

    if (cleanPhone.length >= 7 && phoneMap.has(cleanPhone)) {
      matched = phoneMap.get(cleanPhone);
    } else if (cust.id && idMap.has(cust.id)) {
      matched = idMap.get(cust.id);
    }

    if (matched) {
      // Merge records for the exact same mobile number, keeping the most complete information
      if ((!matched.phone || matched.phone.length < 10) && cust.phone) {
        matched.phone = cleanPhone.length === 10 ? cleanPhone : cust.phone;
      }
      if ((!matched.name || isAnonymousCustomerName(matched.name)) && cust.name && !isAnonymousCustomerName(cust.name)) {
        matched.name = cust.name;
      } else if (cust.name && cust.name.length > (matched.name || "").length && !isAnonymousCustomerName(cust.name)) {
        matched.name = cust.name;
      }

      // Preserve specific gender and do not let older duplicate entries overwrite
      if ((!matched.gender || matched.gender === "unspecified") && cust.gender && cust.gender !== "unspecified") {
        matched.gender = cust.gender;
      }

      if (!matched.email && cust.email) matched.email = cust.email;
      if (!matched.birthday && cust.birthday) matched.birthday = cust.birthday;
      if (!matched.anniversary && cust.anniversary) matched.anniversary = cust.anniversary;
      if (!matched.notes && cust.notes) matched.notes = cust.notes;

      matched.total_visits = Math.max(matched.total_visits || 0, cust.total_visits || 0);
      matched.total_spent = Math.max(matched.total_spent || 0, cust.total_spent || 0);

      if (cust.last_visit) {
        if (!matched.last_visit || new Date(cust.last_visit) > new Date(matched.last_visit)) {
          matched.last_visit = cust.last_visit;
        }
      }
      if (cust.last_reminder_sent_at) {
        if (!matched.last_reminder_sent_at || new Date(cust.last_reminder_sent_at) > new Date(matched.last_reminder_sent_at)) {
          matched.last_reminder_sent_at = cust.last_reminder_sent_at;
        }
      }
      if (cust.created_at) {
        if (!matched.created_at || new Date(cust.created_at) < new Date(matched.created_at)) {
          matched.created_at = cust.created_at;
        }
      }

      // Update index mappings with merged data
      if (matched.id) idMap.set(matched.id, matched);
      if (cleanPhone.length >= 7) phoneMap.set(cleanPhone, matched);
    } else {
      const newEntry: Customer = {
        ...cust,
        id: cust.id || generateUUID(),
        phone: cleanPhone,
        name: cust.name || `Guest (${cleanPhone})`,
        gender: cust.gender && cust.gender !== "unspecified" ? cust.gender : "female",
        total_visits: Number(cust.total_visits) || 0,
        total_spent: Number(cust.total_spent) || 0,
        created_at: cust.created_at || new Date().toISOString(),
      };

      unifiedList.push(newEntry);
      if (newEntry.id) idMap.set(newEntry.id, newEntry);
      if (cleanPhone.length >= 7) phoneMap.set(cleanPhone, newEntry);
    }
  });

  return unifiedList;
}

/**
 * Combines registered customer records and invoices into a single unified, deduplicated list
 * with recalculated visit totals and revenue figures strictly based on Mobile Number.
 */
export function unifyCustomerList(customers: Customer[], invoices: Invoice[]): Customer[] {
  // 1. First deduplicate all registered customer records (only with valid mobile numbers)
  const registered = deduplicateCustomerArray(customers || []);

  const idMap = new Map<string, Customer>();
  const phoneMap = new Map<string, Customer>();
  const unifiedList: Customer[] = [...registered];

  registered.forEach((cust) => {
    if (cust.id) idMap.set(cust.id, cust);
    const cleanPhone = normalizePhoneNumber(cust.phone);
    if (cleanPhone.length >= 7) phoneMap.set(cleanPhone, cust);
  });

  // 2. Scan all non-void invoices to discover or augment customers strictly by Mobile Number
  (invoices || []).forEach((inv) => {
    if (inv.status === "void") return;

    const rawName = inv.customer_name?.trim() || "";
    const cleanPhone = normalizePhoneNumber(inv.customer_phone);
    const isAnon = isAnonymousCustomerName(rawName);

    // STRICT CRM RULE: Skip invoices with no valid mobile number
    if (!cleanPhone || cleanPhone.length < 7) return;

    // Check if we already have this customer by Mobile Number or ID (never by name alone)
    let matched: Customer | undefined;
    if (phoneMap.has(cleanPhone)) {
      matched = phoneMap.get(cleanPhone);
    } else if (inv.customer_id && idMap.has(inv.customer_id)) {
      matched = idMap.get(inv.customer_id);
    }

    if (matched) {
      // Augment existing customer details
      if ((!matched.phone || matched.phone.length < 10) && cleanPhone) {
        matched.phone = cleanPhone.length === 10 ? cleanPhone : (inv.customer_phone || "");
        phoneMap.set(cleanPhone, matched);
      }
      if ((!matched.name || isAnonymousCustomerName(matched.name)) && !isAnon && rawName) {
        matched.name = rawName;
      }
      if (!matched.email && inv.customer_email) {
        matched.email = inv.customer_email;
      }
      if (inv.created_at) {
        if (!matched.last_visit || new Date(inv.created_at) > new Date(matched.last_visit)) {
          matched.last_visit = inv.created_at;
        }
      }
    } else {
      // Create new customer entry discovered from invoice with distinct mobile number
      const newCust: Customer = {
        id: inv.customer_id || generateUUID(),
        name: rawName || `Guest (${cleanPhone})`,
        phone: cleanPhone,
        email: inv.customer_email || undefined,
        gender:
          inv.customer_gender && inv.customer_gender !== "unspecified"
            ? inv.customer_gender
            : "female",
        total_visits: 0,
        total_spent: 0,
        last_visit: inv.created_at,
        created_at: inv.created_at || new Date().toISOString(),
      };

      unifiedList.push(newCust);
      if (newCust.id) idMap.set(newCust.id, newCust);
      phoneMap.set(cleanPhone, newCust);
    }
  });

  // 3. Accurately compute visit counts and spend from real invoices strictly by Mobile Number
  return unifiedList
    .filter((c) => {
      const p = normalizePhoneNumber(c.phone);
      return p && p.length >= 7;
    })
    .map((cust) => {
      const custPhone = normalizePhoneNumber(cust.phone);

      const custInvoices = (invoices || []).filter((inv) => {
        if (inv.status === "void") return false;
        const invPhone = normalizePhoneNumber(inv.customer_phone);

        // Strict matching: ONLY by matching mobile number or explicit customer_id
        if (custPhone.length >= 7 && invPhone.length >= 7) {
          return custPhone === invPhone;
        }
        if (cust.id && inv.customer_id) {
          return cust.id === inv.customer_id;
        }
        return false;
      });

      const invoiceVisits = custInvoices.length;
      const invoiceSpent = custInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

      // Latest visit strictly from matching invoices
      let latestVisit = cust.last_visit;
      custInvoices.forEach((inv) => {
        if (inv.created_at) {
          if (!latestVisit || new Date(inv.created_at) > new Date(latestVisit)) {
            latestVisit = inv.created_at;
          }
        }
      });

      return {
        ...cust,
        // If invoices exist for this phone number, use the exact invoice count & spend
        total_visits:
          invoiceVisits > 0
            ? invoiceVisits
            : Number(cust.total_visits) >= 0
            ? Number(cust.total_visits)
            : 0,
        total_spent:
          invoiceSpent > 0
            ? invoiceSpent
            : Number(cust.total_spent) >= 0
            ? Number(cust.total_spent)
            : 0,
        last_visit: latestVisit,
      };
    });
}

export type CustomerTimeframeFilter = "all" | "today" | "week" | "month";

/**
 * Evaluates whether a customer visited/registered within a given timeframe (today, this week, this month).
 */
export function isCustomerInTimeframe(
  customer: Customer,
  timeframe: CustomerTimeframeFilter,
  now: Date = new Date()
): boolean {
  if (timeframe === "all") return true;
  const visitStr = customer.last_visit || customer.created_at;
  if (!visitStr) return false;

  const visitDate = new Date(visitStr);
  if (isNaN(visitDate.getTime())) return false;

  if (timeframe === "today") {
    return (
      visitDate.getFullYear() === now.getFullYear() &&
      visitDate.getMonth() === now.getMonth() &&
      visitDate.getDate() === now.getDate()
    );
  }

  if (timeframe === "week") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return visitDate >= sevenDaysAgo;
  }

  if (timeframe === "month") {
    return (
      visitDate.getFullYear() === now.getFullYear() &&
      visitDate.getMonth() === now.getMonth()
    );
  }

  return true;
}
