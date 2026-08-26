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
  const nameMap = new Map<string, Customer>();
  const unifiedList: Customer[] = [];

  customers.forEach((cust) => {
    if (!cust) return;
    const cleanPhone = normalizePhoneNumber(cust.phone);
    // STRICT CRM RULE: Only save/keep customers with a valid mobile number (>= 7 digits)
    if (!cleanPhone || cleanPhone.length < 7) return;

    const cleanName = normalizeCustomerName(cust.name);
    const isAnon = isAnonymousCustomerName(cust.name);

    // 1. Check existing match by ID, Phone (if >= 7 digits), or non-anonymous Name
    let matched: Customer | undefined;

    if (cust.id && idMap.has(cust.id)) {
      matched = idMap.get(cust.id);
    } else if (cleanPhone.length >= 7 && phoneMap.has(cleanPhone)) {
      matched = phoneMap.get(cleanPhone);
    } else if (!isAnon && cleanName && nameMap.has(cleanName)) {
      const candidate = nameMap.get(cleanName)!;
      const candidatePhone = normalizePhoneNumber(candidate.phone);
      // Merge only if neither has a conflicting different phone
      if (!candidatePhone || !cleanPhone || candidatePhone === cleanPhone) {
        matched = candidate;
      }
    }

    if (matched) {
      // Merge records, keeping the most complete information
      if ((!matched.phone || matched.phone.length < 10) && cust.phone) {
        matched.phone = cleanPhone.length === 10 ? cleanPhone : cust.phone;
      }
      if ((!matched.name || isAnonymousCustomerName(matched.name)) && cust.name && !isAnon) {
        matched.name = cust.name;
      } else if (cust.name && cust.name.length > (matched.name || "").length && !isAnon) {
        matched.name = cust.name;
      }

      // Preserve specific gender over 'unspecified'
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
      if (cust.created_at) {
        if (!matched.created_at || new Date(cust.created_at) < new Date(matched.created_at)) {
          matched.created_at = cust.created_at;
        }
      }

      // Update index mappings with merged data
      if (matched.id) idMap.set(matched.id, matched);
      const mergedPhone = normalizePhoneNumber(matched.phone);
      if (mergedPhone.length >= 7) phoneMap.set(mergedPhone, matched);
      const mergedName = normalizeCustomerName(matched.name);
      if (mergedName && !isAnonymousCustomerName(matched.name)) nameMap.set(mergedName, matched);
    } else {
      const newEntry: Customer = {
        ...cust,
        id: cust.id || generateUUID(),
        phone: cleanPhone,
        name: cust.name || (cleanPhone ? `Guest (${cleanPhone})` : "Guest"),
        gender: cust.gender || "unspecified",
        total_visits: Number(cust.total_visits) || 0,
        total_spent: Number(cust.total_spent) || 0,
        created_at: cust.created_at || new Date().toISOString(),
      };

      unifiedList.push(newEntry);
      if (newEntry.id) idMap.set(newEntry.id, newEntry);
      if (cleanPhone.length >= 7) phoneMap.set(cleanPhone, newEntry);
      if (!isAnon && cleanName) nameMap.set(cleanName, newEntry);
    }
  });

  return unifiedList;
}

/**
 * Combines registered customer records and invoices into a single unified, deduplicated list
 * with recalculated visit totals and revenue figures.
 */
export function unifyCustomerList(customers: Customer[], invoices: Invoice[]): Customer[] {
  // 1. First deduplicate all registered customer records (only with valid mobile numbers)
  const registered = deduplicateCustomerArray(customers || []);

  const idMap = new Map<string, Customer>();
  const phoneMap = new Map<string, Customer>();
  const nameMap = new Map<string, Customer>();
  const unifiedList: Customer[] = [...registered];

  registered.forEach((cust) => {
    if (cust.id) idMap.set(cust.id, cust);
    const cleanPhone = normalizePhoneNumber(cust.phone);
    if (cleanPhone.length >= 7) phoneMap.set(cleanPhone, cust);
    const cleanName = normalizeCustomerName(cust.name);
    if (cleanName && !isAnonymousCustomerName(cust.name)) nameMap.set(cleanName, cust);
  });

  // 2. Scan all non-void invoices to discover or augment customers
  (invoices || []).forEach((inv) => {
    if (inv.status === "void") return;

    const rawName = inv.customer_name?.trim() || "";
    const cleanPhone = normalizePhoneNumber(inv.customer_phone);
    const cleanName = normalizeCustomerName(rawName);
    const isAnon = isAnonymousCustomerName(rawName);

    // STRICT CRM RULE: Skip invoices with no valid mobile number
    if (!cleanPhone || cleanPhone.length < 7) return;

    // Check if we already have this customer
    let matched: Customer | undefined;
    if (inv.customer_id && idMap.has(inv.customer_id)) {
      matched = idMap.get(inv.customer_id);
    } else if (cleanPhone.length >= 7 && phoneMap.has(cleanPhone)) {
      matched = phoneMap.get(cleanPhone);
    } else if (!isAnon && cleanName && nameMap.has(cleanName)) {
      const candidate = nameMap.get(cleanName)!;
      const candidatePhone = normalizePhoneNumber(candidate.phone);
      // Merge only if neither has a conflicting different phone
      if (!candidatePhone || !cleanPhone || candidatePhone === cleanPhone) {
        matched = candidate;
      }
    }

    if (matched) {
      // Augment existing customer details
      if ((!matched.phone || matched.phone.length < 10) && cleanPhone) {
        matched.phone = cleanPhone.length === 10 ? cleanPhone : (inv.customer_phone || "");
        phoneMap.set(cleanPhone, matched);
      }
      if ((!matched.name || isAnonymousCustomerName(matched.name)) && !isAnon && rawName) {
        matched.name = rawName;
        nameMap.set(cleanName, matched);
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
      // Create new customer entry discovered from invoice
      const newCust: Customer = {
        id: inv.customer_id || generateUUID(),
        name: rawName || (cleanPhone ? `Guest (${cleanPhone})` : "Guest"),
        phone: cleanPhone,
        email: inv.customer_email || undefined,
        gender: "unspecified",
        total_visits: 0,
        total_spent: 0,
        last_visit: inv.created_at,
        created_at: inv.created_at || new Date().toISOString(),
      };

      unifiedList.push(newCust);
      if (newCust.id) idMap.set(newCust.id, newCust);
      if (cleanPhone.length >= 7) phoneMap.set(cleanPhone, newCust);
      if (!isAnon && cleanName) nameMap.set(cleanName, newCust);
    }
  });

  // 3. Accurately compute visit counts and spend from real invoices for all customers
  return unifiedList
    .filter((c) => {
      const p = normalizePhoneNumber(c.phone);
      return p && p.length >= 7;
    })
    .map((cust) => {
      const custPhone = normalizePhoneNumber(cust.phone);
      const custName = normalizeCustomerName(cust.name);
      const isAnon = isAnonymousCustomerName(cust.name);

      const custInvoices = (invoices || []).filter((inv) => {
        if (inv.status === "void") return false;
        const invPhone = normalizePhoneNumber(inv.customer_phone);
        const invName = normalizeCustomerName(inv.customer_name);

        if (custPhone.length >= 7 && invPhone.length >= 7) {
          return custPhone === invPhone;
        }
        if (cust.id && inv.customer_id) {
          return cust.id === inv.customer_id;
        }
        if (!isAnon && custName && custName === invName) {
          return !invPhone || !custPhone || invPhone === custPhone;
        }
        return false;
      });

      const invoiceVisits = custInvoices.length;
      const invoiceSpent = custInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

      return {
        ...cust,
        total_visits: Math.max(cust.total_visits || 0, invoiceVisits),
        total_spent: Math.max(cust.total_spent || 0, invoiceSpent),
      };
    });
}
