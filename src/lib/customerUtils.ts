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
 * Merges duplicate records by ID or exact same Phone + Name while preserving richer details.
 * Distinct customer IDs sharing the same phone number (e.g. family members) are preserved.
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

    // Explicitly allow multiple profiles for 9250755655
    const isSpecialMulti = cleanPhone === "9250755655";

    // Match strictly by ID if present, or by Phone (unless special multi-profile number)
    let matched: Customer | undefined;

    if (cust.id && idMap.has(cust.id)) {
      matched = idMap.get(cust.id);
    } else if (!isSpecialMulti && cleanPhone.length >= 7 && phoneMap.has(cleanPhone)) {
      matched = phoneMap.get(cleanPhone);
    } else if (!cust.id) {
      const normName = normalizeCustomerName(cust.name);
      matched = unifiedList.find(
        (c) =>
          normalizePhoneNumber(c.phone) === cleanPhone &&
          normalizeCustomerName(c.name) === normName
      );
    }

    if (matched) {
      const custUpdatedAt = cust.updated_at ? new Date(cust.updated_at).getTime() : 0;
      const matchedUpdatedAt = matched.updated_at ? new Date(matched.updated_at).getTime() : 0;

      if (custUpdatedAt > matchedUpdatedAt) {
        // Incoming record has a newer update timestamp: adopt updated attributes
        if (cust.name && !isAnonymousCustomerName(cust.name)) {
          matched.name = cust.name;
        }
        if (cleanPhone.length >= 7) {
          matched.phone = cleanPhone.length === 10 ? cleanPhone : cust.phone;
        }
        if (cust.gender && cust.gender !== "unspecified") {
          matched.gender = cust.gender;
        }
        if (cust.email !== undefined) matched.email = cust.email;
        if (cust.birthday !== undefined) matched.birthday = cust.birthday;
        if (cust.anniversary !== undefined) matched.anniversary = cust.anniversary;
        if (cust.notes !== undefined) matched.notes = cust.notes;
        matched.last_reminder_sent_at = cust.last_reminder_sent_at || undefined;
        if (cust.reminder_history !== undefined) matched.reminder_history = cust.reminder_history;
        matched.updated_at = cust.updated_at;
      } else if (matchedUpdatedAt > custUpdatedAt) {
        // matched is strictly newer: preserve matched's name, phone, and metadata, only fill missing attributes
        if (!matched.email && cust.email) matched.email = cust.email;
        if (!matched.birthday && cust.birthday) matched.birthday = cust.birthday;
        if (!matched.anniversary && cust.anniversary) matched.anniversary = cust.anniversary;
        if (!matched.notes && cust.notes) matched.notes = cust.notes;
        if ((!matched.gender || matched.gender === "unspecified") && cust.gender && cust.gender !== "unspecified") {
          matched.gender = cust.gender;
        }
      } else {
        // Timestamps equal or absent: standard merge preferring non-anonymous and complete data
        if ((!matched.phone || matched.phone.length < 10) && cust.phone) {
          matched.phone = cleanPhone.length === 10 ? cleanPhone : cust.phone;
        }

        if ((!matched.name || isAnonymousCustomerName(matched.name)) && cust.name && !isAnonymousCustomerName(cust.name)) {
          matched.name = cust.name;
        }

        if ((!matched.gender || matched.gender === "unspecified") && cust.gender && cust.gender !== "unspecified") {
          matched.gender = cust.gender;
        }

        if (!matched.email && cust.email) matched.email = cust.email;
        if (!matched.birthday && cust.birthday) matched.birthday = cust.birthday;
        if (!matched.anniversary && cust.anniversary) matched.anniversary = cust.anniversary;
        if (!matched.notes && cust.notes) matched.notes = cust.notes;
        if (cust.last_reminder_sent_at !== undefined) {
          matched.last_reminder_sent_at = cust.last_reminder_sent_at || undefined;
        }

        if (cust.updated_at) {
          matched.updated_at = cust.updated_at;
        }
      }

      matched.total_visits = Math.max(matched.total_visits || 0, cust.total_visits || 0);
      matched.total_spent = Math.max(matched.total_spent || 0, cust.total_spent || 0);

      if (cust.last_visit) {
        if (!matched.last_visit || new Date(cust.last_visit) > new Date(matched.last_visit)) {
          matched.last_visit = cust.last_visit;
        }
      }
      if (custUpdatedAt <= matchedUpdatedAt && cust.last_reminder_sent_at) {
        if (!matched.last_reminder_sent_at || new Date(cust.last_reminder_sent_at) > new Date(matched.last_reminder_sent_at)) {
          matched.last_reminder_sent_at = cust.last_reminder_sent_at;
        }
      }
      if (cust.reminder_history && Array.isArray(cust.reminder_history)) {
        const existingHist = matched.reminder_history || [];
        const mergedHist = [...existingHist];
        for (const rh of cust.reminder_history) {
          if (!mergedHist.some((m) => m.sent_at === rh.sent_at)) {
            mergedHist.push(rh);
          }
        }
        matched.reminder_history = mergedHist;
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
        last_reminder_sent_at: cust.last_reminder_sent_at,
        reminder_history: cust.reminder_history || [],
        created_at: cust.created_at || new Date().toISOString(),
        updated_at: cust.updated_at,
      };

      unifiedList.push(newEntry);
      if (newEntry.id) idMap.set(newEntry.id, newEntry);
      if (cleanPhone.length >= 7) phoneMap.set(cleanPhone, newEntry);
    }
  });

  return unifiedList;
}

/**
 * Combines registered customer records and invoices into a single unified list
 * with recalculated visit totals and revenue figures strictly based on Customer ID and Mobile Number.
 */
export function unifyCustomerList(customers: Customer[], invoices: Invoice[]): Customer[] {
  // 1. First deduplicate all registered customer records (only with valid mobile numbers)
  const registered = deduplicateCustomerArray(customers || []);

  const idMap = new Map<string, Customer>();
  const unifiedList: Customer[] = [...registered];

  registered.forEach((cust) => {
    if (cust.id) idMap.set(cust.id, cust);
  });

  // Sort invoices chronologically ascending so newest invoices are processed last and determine the latest customer details
  const sortedInvoices = [...(invoices || [])]
    .filter((inv) => inv.status !== "void")
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  // 2. Scan all non-void invoices to discover or augment customers
  sortedInvoices.forEach((inv) => {
    const rawName = inv.customer_name?.trim() || "";
    const cleanPhone = normalizePhoneNumber(inv.customer_phone);
    const isAnon = isAnonymousCustomerName(rawName);

    // STRICT CRM RULE: Skip invoices with no valid mobile number
    if (!cleanPhone || cleanPhone.length < 7) return;

    // Check if we already have this customer by Customer ID first
    let matched: Customer | undefined;
    if (inv.customer_id && idMap.has(inv.customer_id)) {
      matched = idMap.get(inv.customer_id);
    } else {
      const normInvName = normalizeCustomerName(rawName);
      matched = unifiedList.find((c) => {
        const cPhone = normalizePhoneNumber(c.phone);
        if (cPhone !== cleanPhone) return false;
        if (!isAnon && normInvName && normalizeCustomerName(c.name) === normInvName) return true;
        return false;
      });

      if (!matched) {
        const phoneMatches = unifiedList.filter((c) => normalizePhoneNumber(c.phone) === cleanPhone);
        if (phoneMatches.length === 1) {
          matched = phoneMatches[0];
        }
      }
    }

    if (matched) {
      const custUpdatedAt = matched.updated_at ? new Date(matched.updated_at).getTime() : 0;
      const invTime = inv.created_at ? new Date(inv.created_at).getTime() : 0;
      const isInvoiceNewerOrEqual = invTime >= custUpdatedAt;

      // Invoices augment missing fields on existing CRM profiles
      if ((!matched.phone || matched.phone.length < 7) && cleanPhone) {
        matched.phone = cleanPhone.length === 10 ? cleanPhone : (inv.customer_phone || matched.phone);
      }
      if ((!matched.name || isAnonymousCustomerName(matched.name)) && rawName && !isAnon) {
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
      // If invoice was edited directly with customer_id link, reflect updated phone/name if invoice is newer than customer's manual edit
      if (inv.customer_id && matched.id && inv.customer_id === matched.id) {
        if (cleanPhone && cleanPhone.length >= 7 && isInvoiceNewerOrEqual) {
          matched.phone = cleanPhone.length === 10 ? cleanPhone : (inv.customer_phone || matched.phone);
        }
        if (rawName && !isAnon && isInvoiceNewerOrEqual) {
          matched.name = rawName;
        }
      }
    }
  });

  // 3. Accurately compute visit counts and spend from real invoices
  return unifiedList
    .filter((c) => {
      const p = normalizePhoneNumber(c.phone);
      return p && p.length >= 7;
    })
    .map((cust) => {
      const custPhone = normalizePhoneNumber(cust.phone);
      const normCustName = normalizeCustomerName(cust.name);

      const custInvoices = (invoices || []).filter((inv) => {
        if (inv.status === "void") return false;
        const invPhone = normalizePhoneNumber(inv.customer_phone);

        // Strict matching:
        // Priority 1: Match by customer_id if available on invoice
        if (cust.id && inv.customer_id) {
          return cust.id === inv.customer_id;
        }

        // Priority 2: If no customer_id on invoice, match by phone and name
        if (custPhone.length >= 7 && invPhone.length >= 7 && custPhone === invPhone) {
          const invName = normalizeCustomerName(inv.customer_name);
          if (invName && normCustName && !isAnonymousCustomerName(invName) && !isAnonymousCustomerName(normCustName)) {
            return invName === normCustName;
          }
          // If only 1 customer in the database shares this phone number, match it
          const phoneMatches = unifiedList.filter((c) => normalizePhoneNumber(c.phone) === custPhone);
          if (phoneMatches.length === 1) {
            return true;
          }
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

      const hasAnyInvoices = Array.isArray(invoices) && invoices.length > 0;

      return {
        ...cust,
        total_visits: hasAnyInvoices
          ? invoiceVisits
          : invoiceVisits > 0
          ? invoiceVisits
          : Number(cust.total_visits) >= 0
          ? Number(cust.total_visits)
          : 0,
        total_spent: hasAnyInvoices
          ? invoiceSpent
          : invoiceSpent > 0
          ? invoiceSpent
          : Number(cust.total_spent) >= 0
          ? Number(cust.total_spent)
          : 0,
        last_visit: hasAnyInvoices ? latestVisit : (latestVisit || cust.last_visit),
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
