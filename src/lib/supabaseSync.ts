import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { DEFAULT_USERS, DEFAULT_CATEGORIES, DEFAULT_CATALOG, Storage } from "./storage";
import { normalizePhoneNumber, isAnonymousCustomerName } from "./customerUtils";
import {
  AppUser,
  CatalogItem,
  Category,
  Customer,
  Expense,
  Invoice,
  InvoiceItem,
  ItemType,
  SalonSettings,
  Staff,
} from "@/types";
import { WheelInventoryItem } from "@/types/rewards";

export const isValidUUID = (str?: string | null): boolean =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

export function encodePackageSku(packageServiceIds?: string[], regularPrice?: number): string {
  const shortIds = (packageServiceIds || []).map((id) => id.replace(/-/g, "").slice(-8));
  const str = `P:${Math.round(regularPrice || 0)}|${shortIds.join(",")}`;
  return str.substring(0, 50);
}

export function decodePackageSku(
  sku: string | undefined | null,
  rawCatalog: any[],
  itemName?: string,
  categoryId?: string
): { package_regular_price: number; package_service_ids: string[] } | null {
  if (sku && typeof sku === "string") {
    // 1. Compact SKU format (e.g. "P:300|33330002,33330001")
    if (sku.startsWith("P:")) {
      const match = sku.match(/^P:(\d+)\|(.*)$/);
      if (match) {
        const regularPrice = Number(match[1]) || 0;
        const shortIds = match[2].split(",").filter(Boolean);
        const matchedServiceIds = shortIds
          .map((shortId) => {
            const found = rawCatalog.find(
              (c) =>
                c.id.replace(/-/g, "").endsWith(shortId) ||
                c.id.replace(/-/g, "").startsWith(shortId)
            );
            return found ? found.id : null;
          })
          .filter(Boolean) as string[];
        return { package_regular_price: regularPrice, package_service_ids: matchedServiceIds };
      }
    }

    // 2. PKG_META format fallback
    if (sku.startsWith("PKG_META:")) {
      try {
        const jsonStr = sku.replace("PKG_META:", "");
        const meta = JSON.parse(jsonStr);
        return {
          package_service_ids: meta.package_service_ids || [],
          package_regular_price: Number(meta.package_regular_price) || 0,
        };
      } catch {}
    }
  }

  // 3. Fallback: match by package name against DEFAULT_CATALOG or known services
  if (itemName) {
    const defaultMatch = DEFAULT_CATALOG.find(
      (item) => item.type === "package" && item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    );
    if (defaultMatch) {
      return {
        package_service_ids: defaultMatch.package_service_ids || [],
        package_regular_price: defaultMatch.package_regular_price || defaultMatch.price,
      };
    }
  }

  return null;
}

export const SupabaseSync = {
  // Helper to map remote customer row
  mapRemoteCustomer(cust: any): Customer {
    let userNotes = cust.notes || "";
    let updatedAt = cust.updated_at || cust.created_at;
    let lastReminderSentAt = cust.last_reminder_sent_at || undefined;
    let reminderHistory = cust.reminder_history || [];

    if (cust.notes && typeof cust.notes === "string" && cust.notes.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(cust.notes);
        if (parsed.updated_at) {
          updatedAt = parsed.updated_at;
        }
        if (parsed.text !== undefined) {
          userNotes = parsed.text;
        } else if (parsed.user_notes !== undefined) {
          userNotes = parsed.user_notes;
        }
        if (parsed.last_reminder_sent_at) {
          lastReminderSentAt = parsed.last_reminder_sent_at;
        }
        if (parsed.reminder_history && Array.isArray(parsed.reminder_history)) {
          reminderHistory = parsed.reminder_history;
        }
      } catch {}
    }

    return {
      ...cust,
      notes: userNotes,
      updated_at: updatedAt,
      total_spent: Number(cust.total_spent) || 0,
      last_reminder_sent_at: lastReminderSentAt || cust.last_reminder_sent_at || undefined,
      reminder_history: reminderHistory,
    };
  },

  // Helper to map remote invoice row
  mapRemoteInvoice(inv: any): Invoice {
    let userNotes = inv.notes || "";
    let itemsFromMeta: InvoiceItem[] | null = null;

    if (inv.notes && typeof inv.notes === "string" && inv.notes.startsWith("{")) {
      try {
        const parsed = JSON.parse(inv.notes);
        if (parsed.items_meta && Array.isArray(parsed.items_meta)) {
          itemsFromMeta = parsed.items_meta;
          userNotes = parsed.user_notes || "";
        }
      } catch {}
    }

    const lineItems =
      itemsFromMeta ||
      (inv.invoice_items || []).map((it: any) => ({
        ...it,
        unit_price: Number(it.unit_price) || 0,
        discount: Number(it.discount) || 0,
        total_price: Number(it.total_price) || 0,
      }));

    return {
      ...inv,
      notes: userNotes,
      subtotal: Number(inv.subtotal) || 0,
      tax_amount: Number(inv.tax_amount) || 0,
      discount_amount: Number(inv.discount_amount) || 0,
      grand_total: Number(inv.grand_total) || 0,
      items: lineItems,
    };
  },

  // 1. FETCH ALL DATA FROM SUPABASE
  async loadAllData() {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const nowIso = new Date().toISOString();
      const [
        settingsRes,
        staffRes,
        categoriesRes,
        catalogRes,
        customersRes,
        invoicesRes,
        expensesRes,
        usersRes,
        wheelInventoryRes,
      ] = await Promise.all([
        supabase.from("salon_settings").select("*").single(),
        supabase.from("staff").select("*").order("name").limit(500),
        supabase.from("categories").select("*").order("name").limit(500),
        supabase.from("catalog_items").select("*").order("name").limit(2000),
        supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(5000),
        supabase.from("invoices").select("*, invoice_items(*)").order("created_at", { ascending: false }).limit(500),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(5000),
        supabase.from("app_users").select("*").order("role").limit(100),
        supabase.from("wheel_inventory").select("*").order("created_at").limit(100),
      ]);

      return {
        syncTimestamp: nowIso,
        settings: settingsRes.data || null,
        staff: (staffRes.data || []).map((s: any) => {
          let parsedNotes = s.notes || "";
          let commission_type: "percent" | "fixed" = "percent";
          let product_commission_rate = Number(s.commission_rate) || 0;
          let product_commission_type: "percent" | "fixed" = "percent";
          let floorStatus = s.status || "active";

          try {
            if (s.notes && typeof s.notes === "string" && s.notes.startsWith("{")) {
              const meta = JSON.parse(s.notes);
              if (meta.commission_type === "fixed" || meta.commission_type === "percent") {
                commission_type = meta.commission_type;
              }
              if (meta.product_commission_rate !== undefined) {
                product_commission_rate = Number(meta.product_commission_rate) || 0;
              }
              if (meta.product_commission_type === "fixed" || meta.product_commission_type === "percent") {
                product_commission_type = meta.product_commission_type;
              }
              if (meta.floor_status) {
                floorStatus = meta.floor_status;
              }
              parsedNotes = meta.custom_notes || "";
            }
          } catch (e) {
            // regular string note
          }

          // Normalize status
          if (floorStatus === "present") floorStatus = "active";
          if (floorStatus === "absent") floorStatus = "on_leave";

          return {
            ...s,
            commission_rate: Number(s.commission_rate) || 0,
            commission_type,
            product_commission_rate,
            product_commission_type,
            status: floorStatus,
            notes: parsedNotes,
          };
        }),
        categories: (() => {
          const remoteCats = (categoriesRes.data || []).map((cat: any) => {
            let catType = cat.type;
            let catIcon = cat.icon || "Sparkles";
            if (cat.icon && typeof cat.icon === "string" && cat.icon.startsWith("PKG:")) {
              catType = "package";
              catIcon = cat.icon.replace("PKG:", "");
            }
            return {
              ...cat,
              type: catType,
              icon: catIcon,
            };
          });

          const list = [...remoteCats];
          const pkgCat = DEFAULT_CATEGORIES.find((c) => c.type === "package") || DEFAULT_CATEGORIES[0];
          if (!list.some((c) => c.type === "package" || c.id === pkgCat.id || c.name.toLowerCase().trim() === "packages & combos")) {
            list.unshift(pkgCat);
            SupabaseSync.saveCategory(pkgCat);
          }
          return list;
        })(),
        catalog: (() => {
          const remoteCatalog = (catalogRes.data || []).map((c: any) => {
            let itemType: ItemType = c.type;
            let package_service_ids: string[] | undefined = c.package_service_ids;
            let package_regular_price: number | undefined = c.package_regular_price
              ? Number(c.package_regular_price)
              : undefined;
            let sku = c.sku;

            // Check if item is a package combo
            const isPackageCategory =
              c.category_id === "22222222-2222-2222-2222-222222222209" ||
              (c.sku && typeof c.sku === "string" && (c.sku.startsWith("P:") || c.sku.startsWith("PKG_META:")));

            if (itemType === "package" || isPackageCategory) {
              itemType = "package";
              const decoded = decodePackageSku(c.sku, catalogRes.data || [], c.name, c.category_id);
              if (decoded) {
                package_service_ids = decoded.package_service_ids;
                package_regular_price = decoded.package_regular_price || Number(c.price);
              }
              sku = "";
            }

            return {
              ...c,
              type: itemType,
              package_service_ids,
              package_regular_price,
              sku,
              price: Number(c.price) || 0,
              cost_price: Number(c.cost_price) || 0,
            };
          });

          return remoteCatalog;
        })(),
        customers: (customersRes.data || []).map((cust: any) => this.mapRemoteCustomer(cust)),
        invoices: (invoicesRes.data || []).map((inv: any) => this.mapRemoteInvoice(inv)),
        expenses: (expensesRes.data || []).map((e: any) => ({
          ...e,
          amount: Number(e.amount) || 0,
        })),
        users: (() => {
          const remoteUsers = (usersRes.data || []) as AppUser[];
          const list = [...remoteUsers];
          // Ensure Sushobhit, Prabhat, and Amit always exist
          if (!list.some((u) => u.id === "usr-admin-01" || (u.email && u.email.toLowerCase() === "sushobhit@belezia.com"))) {
            list.unshift(DEFAULT_USERS[0]);
          }
          if (!list.some((u) => u.id === "usr-admin-02" || (u.email && u.email.toLowerCase() === "prabhat@belezia.com"))) {
            list.splice(1, 0, DEFAULT_USERS[1]);
          }
          if (!list.some((u) => u.id === "usr-rec-01" || (u.email && u.email.toLowerCase() === "amit@belezia.com"))) {
            list.push(DEFAULT_USERS[2]);
          }

          // Strict deduplication by ID and Email
          const seenIds = new Set<string>();
          const seenEmails = new Set<string>();
          const uniqueList: AppUser[] = [];
          for (const u of list) {
            if (!u || typeof u !== "object" || !u.id) continue;
            const cleanEmail = (u.email || "").toLowerCase().trim();
            if (!seenIds.has(u.id) && (!cleanEmail || !seenEmails.has(cleanEmail))) {
              seenIds.add(u.id);
              if (cleanEmail) seenEmails.add(cleanEmail);
              uniqueList.push(u);
            }
          }
          return uniqueList;
        })(),
        wheelInventory:
          wheelInventoryRes?.data && wheelInventoryRes.data.length > 0
            ? (wheelInventoryRes.data as WheelInventoryItem[])
            : Storage.getWheelInventory(),
      };
    } catch (err) {
      console.warn("Supabase fetch error, falling back to local storage:", err);
      return null;
    }
  },

  // 1b. FETCH INCREMENTAL DELTA (LIGHTWEIGHT POLLING FOR 30S HEARTBEAT & REALTIME)
  async loadIncrementalData(sinceTimestamp?: string) {
    if (!isSupabaseConfigured() || !supabase) return null;
    if (!sinceTimestamp) return this.loadAllData();

    try {
      const nowIso = new Date().toISOString();

      // Query only new invoices since sinceTimestamp, plus latest 15 to catch any edits or voids
      const [
        newInvoicesRes,
        recentInvoicesRes,
        customersRes,
        expensesRes,
        wheelInventoryRes,
      ] = await Promise.all([
        supabase
          .from("invoices")
          .select("*, invoice_items(*)")
          .gt("created_at", sinceTimestamp)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("invoices")
          .select("*, invoice_items(*)")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("customers")
          .select("*")
          .gt("created_at", sinceTimestamp)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("expenses")
          .select("*")
          .gt("created_at", sinceTimestamp)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("wheel_inventory")
          .select("*")
          .order("created_at")
          .limit(100),
      ]);

      const invoiceMap = new Map<string, Invoice>();
      (newInvoicesRes.data || []).forEach((inv: any) => {
        const mapped = this.mapRemoteInvoice(inv);
        if (mapped.id) invoiceMap.set(mapped.id, mapped);
      });
      (recentInvoicesRes.data || []).forEach((inv: any) => {
        const mapped = this.mapRemoteInvoice(inv);
        if (mapped.id && !invoiceMap.has(mapped.id)) invoiceMap.set(mapped.id, mapped);
      });

      return {
        syncTimestamp: nowIso,
        invoices: Array.from(invoiceMap.values()),
        customers: (customersRes.data || []).map((c: any) => this.mapRemoteCustomer(c)),
        expenses: (expensesRes.data || []).map((e: any) => ({
          ...e,
          amount: Number(e.amount) || 0,
        })),
        wheelInventory: (wheelInventoryRes.data || []) as WheelInventoryItem[],
      };
    } catch (err) {
      console.warn("Supabase incremental fetch warning:", err);
      return null;
    }
  },

  // 1c. ON-DEMAND HISTORICAL INVOICES QUERY (FOR ADMIN INVOICE MANAGEMENT & AUDITING)
  async fetchHistoricalInvoices(params: {
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    customerId?: string;
    customerPhone?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ invoices: Invoice[]; totalCount: number }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { invoices: [], totalCount: 0 };
    }

    try {
      let query = supabase
        .from("invoices")
        .select("*, invoice_items(*)", { count: "exact" });

      if (params.startDate) {
        query = query.gte("created_at", params.startDate);
      }
      if (params.endDate) {
        query = query.lte("created_at", params.endDate);
      }
      if (params.customerId) {
        query = query.eq("customer_id", params.customerId);
      }
      if (params.customerPhone) {
        const cleanP = normalizePhoneNumber(params.customerPhone);
        if (cleanP) query = query.eq("customer_phone", cleanP);
      }
      if (params.searchQuery && params.searchQuery.trim()) {
        const q = params.searchQuery.trim();
        query = query.or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
      }

      const limit = params.limit || 50;
      const offset = params.offset || 0;

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) {
        console.error("Supabase fetchHistoricalInvoices error:", error);
        return { invoices: [], totalCount: 0 };
      }

      const mapped = (data || []).map((inv: any) => this.mapRemoteInvoice(inv));
      return { invoices: mapped, totalCount: count || mapped.length };
    } catch (err) {
      console.error("Supabase fetchHistoricalInvoices exception:", err);
      return { invoices: [], totalCount: 0 };
    }
  },

  async fetchInvoiceById(invoiceId: string): Promise<Invoice | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapRemoteInvoice(data);
    } catch {
      return null;
    }
  },

  // 2. CREATE INVOICE IN SUPABASE
  async createInvoice(invoice: Invoice) {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const isValidUUID = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      // Store rich items metadata (with package_services, item_type 'package', and per-service custom prices & stylists)
      const notesPayload = JSON.stringify({
        user_notes: invoice.notes || "",
        items_meta: invoice.items,
      });

      // Pre-check staff and catalog items in Supabase to guarantee foreign keys never fail
      let validStaffIds: Set<string> | null = null;
      let validCatalogIds: Set<string> | null = null;
      try {
        const [{ data: staffData }, { data: catalogData }] = await Promise.all([
          supabase.from("staff").select("id"),
          supabase.from("catalog_items").select("id"),
        ]);
        if (staffData) validStaffIds = new Set(staffData.map((s: any) => s.id));
        if (catalogData) validCatalogIds = new Set(catalogData.map((c: any) => c.id));
      } catch {
        // Non-blocking
      }

      // Ensure customer profile is recorded in Supabase customers table with correct gender (non-blocking)
      let finalCustomerId: string | null = null;
      try {
        const cleanPhone = normalizePhoneNumber(invoice.customer_phone);
        if (cleanPhone && cleanPhone.length >= 7) {
          const standardPhone = cleanPhone.length === 10 ? cleanPhone : (invoice.customer_phone || "");
          const custGender =
            invoice.customer_gender && invoice.customer_gender !== "unspecified"
              ? invoice.customer_gender
              : "female";

          const { data: existingCust } = await supabase
            .from("customers")
            .select("id, gender, total_visits, total_spent")
            .eq("phone", standardPhone)
            .maybeSingle();

          // Calculate accurate non-void invoice count and total spent for this customer
          const { data: phoneInvoices } = await supabase
            .from("invoices")
            .select("id, grand_total, status")
            .eq("customer_phone", standardPhone)
            .neq("status", "void");

          const previousInvoices = (phoneInvoices || []).filter((inv) => inv.id !== invoice.id);
          const accurateVisits = previousInvoices.length + 1;
          const accurateSpent =
            previousInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0) +
            Number(invoice.grand_total || 0);

          const customerPayload = {
            id: existingCust?.id || (isValidUUID(invoice.customer_id) ? invoice.customer_id : undefined),
            name: invoice.customer_name || `Guest (${standardPhone})`,
            phone: standardPhone,
            email: invoice.customer_email || null,
            gender: custGender,
            total_visits: accurateVisits,
            total_spent: accurateSpent,
            last_visit: invoice.created_at || new Date().toISOString(),
            created_at: invoice.created_at || new Date().toISOString(),
          };

          const { data: upsertedCust } = await supabase
            .from("customers")
            .upsert(customerPayload, { onConflict: "phone" })
            .select("id")
            .maybeSingle();

          if (upsertedCust?.id) {
            finalCustomerId = upsertedCust.id;
          }
        } else if (isValidUUID(invoice.customer_id)) {
          // Verify customer_id actually exists in Supabase customers table to prevent foreign key error
          const { data: custExists } = await supabase
            .from("customers")
            .select("id")
            .eq("id", invoice.customer_id)
            .maybeSingle();

          if (custExists?.id) {
            finalCustomerId = custExists.id;
          }
        }
      } catch (custErr) {
        console.warn("Non-fatal error updating customer profile during invoice creation:", custErr);
      }

      // Sanitize header to match exact columns and check constraints of 'invoices' table
      const safeDiscountType =
        (invoice.discount_type as string) === "percentage" || (invoice.discount_type as string) === "percent"
          ? "percentage"
          : "flat";
      const safePaymentMode = ["cash", "upi", "card", "split"].includes(invoice.payment_mode || "")
        ? invoice.payment_mode
        : "cash";
      const safeStatus = ["paid", "void", "pending"].includes(invoice.status || "")
        ? invoice.status
        : "paid";

      const invoiceHeader = {
        id: isValidUUID(invoice.id) ? invoice.id : undefined,
        invoice_number: invoice.invoice_number,
        customer_id: finalCustomerId,
        customer_name: (invoice.customer_name || "").trim() || "Walk-in Guest",
        customer_phone: invoice.customer_phone || null,
        subtotal: Number(invoice.subtotal) || 0,
        discount_amount: Number(invoice.discount_amount) || 0,
        discount_type: safeDiscountType,
        discount_value: Number(invoice.discount_value) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
        tax_rate: Number(invoice.tax_rate) || 0,
        grand_total: Number(invoice.grand_total) || 0,
        payment_mode: safePaymentMode,
        payment_breakdown: invoice.payment_breakdown || null,
        status: safeStatus,
        notes: notesPayload,
        created_at: invoice.created_at || new Date().toISOString(),
      };

      let createdInv: any = null;
      const { data: directInv, error: invError } = await supabase
        .from("invoices")
        .upsert(invoiceHeader, { onConflict: "invoice_number" })
        .select()
        .single();

      if (invError) {
        if (invError.code === "23505" || invError.message?.includes("duplicate key")) {
          const { data: existingInv } = await supabase
            .from("invoices")
            .select()
            .eq("invoice_number", invoice.invoice_number)
            .maybeSingle();
          if (existingInv) {
            return existingInv;
          }
        }

        console.warn("Primary invoice upsert encountered error; retrying with customer_id=null fallback:", invError);
        const fallbackHeader = { ...invoiceHeader, customer_id: null };
        const { data: retryInv, error: retryError } = await supabase
          .from("invoices")
          .upsert(fallbackHeader, { onConflict: "invoice_number" })
          .select()
          .single();

        if (retryError) {
          if (retryError.code === "23505" || retryError.message?.includes("duplicate key")) {
            const { data: existingInv } = await supabase
              .from("invoices")
              .select()
              .eq("invoice_number", invoice.invoice_number)
              .maybeSingle();
            if (existingInv) {
              return existingInv;
            }
          }
          console.error("Supabase createInvoice fatal error:", retryError);
          throw retryError;
        }
        createdInv = retryInv;
      } else {
        createdInv = directInv;
      }

      const invId = createdInv.id;

      // Insert line items with sanitized columns matching 'invoice_items' table
      if (invoice.items && invoice.items.length > 0) {
        const isStaffValid = (sId?: string | null) =>
          isValidUUID(sId) && (!validStaffIds || validStaffIds.has(sId!));
        const isCatalogValid = (cId?: string | null) =>
          isValidUUID(cId) && (!validCatalogIds || validCatalogIds.has(cId!));

        const lineItemsPayload = invoice.items.map((item) => {
          const fallbackStaffId =
            item.primary_staff_id ||
            item.package_services?.find((s) => s.primary_staff_id)?.primary_staff_id ||
            null;

          return {
            id: isValidUUID(item.id) ? item.id : undefined,
            invoice_id: invId,
            item_id: isCatalogValid(item.item_id) ? item.item_id : null,
            item_name: item.item_name,
            item_type: item.item_type === "product" ? "product" : "service",
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            discount: Number(item.discount) || 0,
            total_price: Number(item.total_price) || 0,
            primary_staff_id: isStaffValid(fallbackStaffId) ? fallbackStaffId : null,
            secondary_staff_id: isStaffValid(item.secondary_staff_id) ? item.secondary_staff_id : null,
            primary_split_ratio: Number(item.primary_split_ratio) || 100,
            secondary_split_ratio: Number(item.secondary_split_ratio) || 0,
          };
        });

        const { error: itemsError } = await supabase.from("invoice_items").upsert(lineItemsPayload);
        if (itemsError) {
          console.warn("Supabase invoice_items initial upsert error, retrying without foreign keys:", itemsError);
          const sanitizedPayload = lineItemsPayload.map((li) => ({
            ...li,
            item_id: null,
            primary_staff_id: null,
            secondary_staff_id: null,
          }));
          const { error: retryItemsError } = await supabase.from("invoice_items").upsert(sanitizedPayload);
          if (retryItemsError) {
            console.error("Fatal invoice_items fallback error:", retryItemsError);
          }
        }
      }

      return createdInv;
    } catch (err) {
      console.error("Supabase createInvoice error:", err);
      return null;
    }
  },

  async updateInvoice(invoice: Invoice) {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const isValidUUID = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      // Store rich items metadata
      const notesPayload = JSON.stringify({
        user_notes: invoice.notes || "",
        items_meta: invoice.items,
      });

      // Pre-check staff and catalog items in Supabase
      let validStaffIds: Set<string> | null = null;
      let validCatalogIds: Set<string> | null = null;
      try {
        const [{ data: staffData }, { data: catalogData }] = await Promise.all([
          supabase.from("staff").select("id"),
          supabase.from("catalog_items").select("id"),
        ]);
        if (staffData) validStaffIds = new Set(staffData.map((s: any) => s.id));
        if (catalogData) validCatalogIds = new Set(catalogData.map((c: any) => c.id));
      } catch {
        // Non-blocking
      }

      // 1. Update invoice header
      let finalCustomerId: string | null = null;
      if (isValidUUID(invoice.customer_id)) {
        const { data: custExists } = await supabase
          .from("customers")
          .select("id")
          .eq("id", invoice.customer_id)
          .maybeSingle();
        if (custExists?.id) {
          finalCustomerId = custExists.id;
        }
      }

      const safeDiscountType =
        (invoice.discount_type as string) === "percentage" || (invoice.discount_type as string) === "percent"
          ? "percentage"
          : "flat";
      const safePaymentMode = ["cash", "upi", "card", "split"].includes(invoice.payment_mode || "")
        ? invoice.payment_mode
        : "cash";
      const safeStatus = ["paid", "void", "pending"].includes(invoice.status || "")
        ? invoice.status
        : "paid";

      const invoiceHeader = {
        invoice_number: invoice.invoice_number,
        customer_id: finalCustomerId,
        customer_name: (invoice.customer_name || "").trim() || "Walk-in Guest",
        customer_phone: invoice.customer_phone || null,
        subtotal: Number(invoice.subtotal) || 0,
        discount_amount: Number(invoice.discount_amount) || 0,
        discount_type: safeDiscountType,
        discount_value: Number(invoice.discount_value) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
        tax_rate: Number(invoice.tax_rate) || 0,
        grand_total: Number(invoice.grand_total) || 0,
        payment_mode: safePaymentMode,
        payment_breakdown: invoice.payment_breakdown || null,
        status: safeStatus,
        notes: notesPayload,
      };

      const { data: updatedInv, error: invError } = await supabase
        .from("invoices")
        .update(invoiceHeader)
        .eq("id", invoice.id)
        .select()
        .single();

      if (invError) {
        console.warn("Supabase primary updateInvoice error; retrying with customer_id=null:", invError);
        const { data: retryInv, error: retryError } = await supabase
          .from("invoices")
          .update({ ...invoiceHeader, customer_id: null })
          .eq("id", invoice.id)
          .select()
          .single();
        if (retryError) throw retryError;
      }

      // 2. Synchronize line items (delete previous items for this invoice and insert updated items)
      if (invoice.items) {
        await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);

        if (invoice.items.length > 0) {
          const isStaffValid = (sId?: string | null) =>
            isValidUUID(sId) && (!validStaffIds || validStaffIds.has(sId!));
          const isCatalogValid = (cId?: string | null) =>
            isValidUUID(cId) && (!validCatalogIds || validCatalogIds.has(cId!));

          const lineItemsPayload = invoice.items.map((item) => {
            const fallbackStaffId =
              item.primary_staff_id ||
              item.package_services?.find((s) => s.primary_staff_id)?.primary_staff_id ||
              null;

            return {
              id: isValidUUID(item.id) ? item.id : undefined,
              invoice_id: invoice.id,
              item_id: isCatalogValid(item.item_id) ? item.item_id : null,
              item_name: item.item_name,
              item_type: item.item_type === "product" ? "product" : "service",
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.unit_price) || 0,
              discount: Number(item.discount) || 0,
              total_price: Number(item.total_price) || 0,
              primary_staff_id: isStaffValid(fallbackStaffId) ? fallbackStaffId : null,
              secondary_staff_id: isStaffValid(item.secondary_staff_id) ? item.secondary_staff_id : null,
              primary_split_ratio: Number(item.primary_split_ratio) || 100,
              secondary_split_ratio: Number(item.secondary_split_ratio) || 0,
            };
          });

          const { error: itemsError } = await supabase.from("invoice_items").insert(lineItemsPayload);
          if (itemsError) {
            console.warn("Supabase invoice_items update error; retrying without foreign keys:", itemsError);
            const sanitizedPayload = lineItemsPayload.map((li) => ({
              ...li,
              item_id: null,
              primary_staff_id: null,
              secondary_staff_id: null,
            }));
            await supabase.from("invoice_items").insert(sanitizedPayload);
          }
        }
      }

      // 3. Synchronize customer profile in Supabase customers table and all other invoices
      try {
        const cleanPhone = normalizePhoneNumber(invoice.customer_phone);
        const standardPhone = cleanPhone.length === 10 ? cleanPhone : (invoice.customer_phone || null);
        let targetCustId = finalCustomerId;

        if (!targetCustId && standardPhone && standardPhone.length >= 7) {
          const { data: matchedCust } = await supabase
            .from("customers")
            .select("id, notes")
            .eq("phone", standardPhone)
            .maybeSingle();
          if (matchedCust?.id) {
            targetCustId = matchedCust.id;
          }
        }

        if (targetCustId) {
          const custUpdatedAt = new Date().toISOString();
          const updateCustPayload: any = {
            notes: JSON.stringify({ text: "", updated_at: custUpdatedAt }),
          };
          if (invoice.customer_name && !isAnonymousCustomerName(invoice.customer_name)) {
            updateCustPayload.name = invoice.customer_name.trim();
          }
          if (standardPhone && standardPhone.length >= 7) {
            updateCustPayload.phone = standardPhone;
          }
          if (invoice.customer_email) {
            updateCustPayload.email = invoice.customer_email.trim();
          }
          if (invoice.customer_gender && invoice.customer_gender !== "unspecified") {
            updateCustPayload.gender = invoice.customer_gender;
          }

          await supabase
            .from("customers")
            .update(updateCustPayload)
            .eq("id", targetCustId);

          // Synchronize other invoices in Supabase linked to this customer
          const syncOtherInvs: any = {};
          if (updateCustPayload.name) syncOtherInvs.customer_name = updateCustPayload.name;
          if (updateCustPayload.phone) syncOtherInvs.customer_phone = updateCustPayload.phone;
          if (updateCustPayload.gender) syncOtherInvs.customer_gender = updateCustPayload.gender;
          if (updateCustPayload.email) syncOtherInvs.customer_email = updateCustPayload.email;

          if (Object.keys(syncOtherInvs).length > 0) {
            await supabase
              .from("invoices")
              .update(syncOtherInvs)
              .eq("customer_id", targetCustId);

            if (standardPhone && standardPhone.length >= 7) {
              await supabase
                .from("invoices")
                .update(syncOtherInvs)
                .eq("customer_phone", standardPhone);
            }
          }
        }
      } catch (custSyncErr) {
        console.warn("Supabase updateInvoice customer sync non-blocking warning:", custSyncErr);
      }

      return updatedInv;
    } catch (err) {
      console.error("Supabase updateInvoice error:", err);
      return null;
    }
  },

  async voidInvoice(invoiceId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;
    try {
      const { error } = await supabase.from("invoices").update({ status: "void" }).eq("id", invoiceId);
      if (error) {
        console.error("Supabase voidInvoice error:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Supabase voidInvoice error:", err);
      return false;
    }
  },

  async deleteInvoice(invoiceId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;
    try {
      let targetId: string | null = isValidUUID(invoiceId) ? invoiceId : null;
      let targetNum: string | null = null;

      const { data: inv } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_id, customer_phone")
        .or(`id.eq.${targetId || "00000000-0000-0000-0000-000000000000"},invoice_number.eq.${invoiceId}`)
        .maybeSingle();

      if (inv) {
        targetId = inv.id;
        targetNum = inv.invoice_number;
      }

      if (targetId) {
        await supabase.from("invoice_items").delete().eq("invoice_id", targetId);
        await supabase.from("invoices").delete().eq("id", targetId);
      }
      if (targetNum) {
        await supabase.from("invoices").delete().eq("invoice_number", targetNum);
      }

      // Recompute customer visits & spend in Supabase
      const custPhone = inv?.customer_phone;
      const custId = inv?.customer_id;
      if (custPhone || custId) {
        let query = supabase.from("invoices").select("grand_total, created_at").neq("status", "void");
        if (custPhone && isValidUUID(custId)) {
          query = query.or(`customer_phone.eq.${custPhone},customer_id.eq.${custId}`);
        } else if (custPhone) {
          query = query.eq("customer_phone", custPhone);
        } else if (custId) {
          query = query.eq("customer_id", custId);
        }
        const { data: remainingInvs } = await query;
        const remaining = remainingInvs || [];
        const accurateVisits = remaining.length;
        const accurateSpent = remaining.reduce((sum: number, i: any) => sum + (Number(i.grand_total) || 0), 0);
        const lastVisit = remaining.length > 0 ? remaining[0].created_at : null;

        if (custId && isValidUUID(custId)) {
          await supabase.from("customers").update({
            total_visits: accurateVisits,
            total_spent: accurateSpent,
            last_visit: lastVisit,
          }).eq("id", custId);
        } else if (custPhone) {
          await supabase.from("customers").update({
            total_visits: accurateVisits,
            total_spent: accurateSpent,
            last_visit: lastVisit,
          }).eq("phone", custPhone);
        }
      }
      return true;
    } catch (err) {
      console.error("Supabase deleteInvoice error:", err);
      return false;
    }
  },

  // 3. STAFF SYNC
  async saveStaff(staffMember: Staff) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const validStatus =
        staffMember.status === "half_day" ||
        staffMember.status === "on_leave" ||
        staffMember.status === "weekly_off" ||
        staffMember.status === "inactive"
          ? staffMember.status
          : "active";

      const todayStr = new Date().toLocaleDateString("en-CA");

      const incentiveMeta = {
        commission_type: staffMember.commission_type || "percent",
        product_commission_rate:
          staffMember.product_commission_rate !== undefined
            ? Number(staffMember.product_commission_rate)
            : (Number(staffMember.commission_rate) || 0),
        product_commission_type: staffMember.product_commission_type || "percent",
        floor_status: validStatus,
        status_date: todayStr,
        custom_notes: staffMember.notes || "",
      };

      const payload = {
        id: staffMember.id,
        name: staffMember.name,
        phone: staffMember.phone || null,
        role: staffMember.role,
        commission_rate: Number(staffMember.commission_rate) || 0,
        status: validStatus,
        color: staffMember.color || null,
        notes: JSON.stringify(incentiveMeta),
      };

      const { data, error } = await supabase.from("staff").upsert(payload).select().single();
      if (error) {
        // Fallback for legacy DB constraints where 'half_day' or 'weekly_off' might trigger a check constraint
        const safePgStatus =
          validStatus === "inactive"
            ? "inactive"
            : validStatus === "on_leave" || validStatus === "weekly_off"
            ? "on_leave"
            : "active";

        const fallbackPayload = {
          ...payload,
          status: safePgStatus,
        };

        const { data: fallbackData, error: fallbackError } = await supabase
          .from("staff")
          .upsert(fallbackPayload)
          .select()
          .single();

        if (fallbackError) {
          console.error("Supabase saveStaff error:", fallbackError);
          return null;
        }
        return fallbackData;
      }
      return data;
    } catch (err) {
      console.error("Supabase saveStaff error:", err);
      return null;
    }
  },

  async deleteStaff(staffId: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("staff").delete().eq("id", staffId);
    } catch (err) {
      console.error("Supabase deleteStaff error:", err);
    }
  },

  // 4. CATALOG SYNC
  async saveCatalogItem(item: CatalogItem) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const isValidUUID = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      const validId = isValidUUID(item.id) ? item.id : undefined;
      const validCatId = isValidUUID(item.category_id) ? item.category_id : null;

      // 1. First attempt direct upsert
      const directPayload = {
        ...item,
        ...(validId ? { id: validId } : {}),
        category_id: validCatId,
        price: Number(item.price) || 0,
        package_regular_price:
          item.package_regular_price !== undefined ? Number(item.package_regular_price) : undefined,
      };

      const { data, error } = await supabase.from("catalog_items").upsert(directPayload).select().single();
      if (!error) return data;

      console.warn("Supabase direct saveCatalogItem failed, attempting backward-compatible payload:", error.message);

      // 2. Compatibility fallback: encode package metadata in compact SKU (fits in VARCHAR(50))
      const compatPayload = {
        ...(validId ? { id: validId } : {}),
        category_id: validCatId,
        name: item.name,
        type: item.type === "package" ? "service" : item.type,
        price: Number(item.price) || 0,
        duration_mins: Number(item.duration_mins) || 30,
        cost_price: Number(item.cost_price) || 0,
        sku:
          item.type === "package"
            ? encodePackageSku(item.package_service_ids, item.package_regular_price || item.price)
            : item.sku || null,
        is_active: item.is_active !== false,
        created_at: item.created_at || new Date().toISOString(),
      };

      let { data: compatData, error: compatError } = await supabase
        .from("catalog_items")
        .upsert(compatPayload)
        .select()
        .single();

      // If error was due to category foreign key constraint, retry with category_id: null
      if (compatError) {
        const { data: noCatData, error: noCatError } = await supabase
          .from("catalog_items")
          .upsert({ ...compatPayload, category_id: null })
          .select()
          .single();

        if (!noCatError) return noCatData;
        console.error("Supabase compat saveCatalogItem error:", compatError);
      }
      return compatData;
    } catch (err) {
      console.error("Supabase saveCatalogItem error:", err);
      return null;
    }
  },

  async deleteCatalogItem(itemId: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("catalog_items").delete().eq("id", itemId);
    } catch (err) {
      console.error("Supabase deleteCatalogItem error:", err);
    }
  },

  // 5. CATEGORIES SYNC
  async saveCategory(category: Category) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase.from("categories").upsert(category).select().single();
      if (!error) return data;

      console.warn("Supabase direct saveCategory failed, attempting compatibility payload:", error.message);
      const compatPayload = {
        id: category.id,
        name: category.name,
        type: category.type === "package" ? "service" : category.type,
        icon: category.type === "package" ? `PKG:${category.icon || "Sparkles"}` : category.icon || "Sparkles",
        created_at: category.created_at || new Date().toISOString(),
      };

      const { data: compatData, error: compatError } = await supabase
        .from("categories")
        .upsert(compatPayload)
        .select()
        .single();

      if (compatError) {
        console.error("Supabase compat saveCategory error:", compatError);
      }
      return compatData;
    } catch (err) {
      console.error("Supabase saveCategory error:", err);
      return null;
    }
  },

  async deleteCategory(categoryId: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("categories").delete().eq("id", categoryId);
    } catch (err) {
      console.error("Supabase deleteCategory error:", err);
    }
  },

  // 6. APP USERS SYNC
  async saveUser(user: AppUser) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase.from("app_users").upsert(user).select().single();
      if (error) console.error("Supabase saveUser error:", error);
      return data;
    } catch (err) {
      console.error("Supabase saveUser error:", err);
      return null;
    }
  },

  async deleteUser(userId: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("app_users").delete().eq("id", userId);
    } catch (err) {
      console.error("Supabase deleteUser error:", err);
    }
  },

  // 7. CUSTOMERS SYNC
  async saveCustomer(customer: Customer) {
    if (!isSupabaseConfigured() || !supabase) return null;
    const cleanPhone = normalizePhoneNumber(customer.phone);
    // STRICT CRM RULE: Only sync customers with valid mobile numbers (>= 7 digits)
    if (!cleanPhone || cleanPhone.length < 7) {
      return null;
    }
    try {
      const standardPhone = cleanPhone.length === 10 ? cleanPhone : customer.phone;

      const cleanBirthday =
        customer.birthday && typeof customer.birthday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(customer.birthday.trim())
          ? customer.birthday.trim()
          : null;
      const cleanAnniversary =
        customer.anniversary && typeof customer.anniversary === "string" && /^\d{4}-\d{2}-\d{2}$/.test(customer.anniversary.trim())
          ? customer.anniversary.trim()
          : null;

      const cleanGender =
        customer.gender && ["female", "male", "other", "unspecified"].includes(customer.gender)
          ? customer.gender
          : "female";

      const updatedAtIso = customer.updated_at || new Date().toISOString();
      let rawNotes = customer.notes?.trim() || "";
      if (rawNotes.startsWith("{")) {
        try {
          const parsed = JSON.parse(rawNotes);
          rawNotes = parsed.text !== undefined ? parsed.text : (parsed.user_notes !== undefined ? parsed.user_notes : "");
        } catch {}
      }

      const notesPayload = JSON.stringify({
        text: rawNotes,
        updated_at: updatedAtIso,
        last_reminder_sent_at: customer.last_reminder_sent_at || undefined,
        reminder_history: customer.reminder_history || undefined,
      });

      const payload: any = {
        name: customer.name?.trim() || `Guest (${standardPhone})`,
        phone: standardPhone,
        email: customer.email?.trim() || null,
        gender: cleanGender,
        birthday: cleanBirthday,
        anniversary: cleanAnniversary,
        total_visits: Number(customer.total_visits) >= 0 ? Number(customer.total_visits) : 0,
        total_spent: Number(customer.total_spent) >= 0 ? Number(customer.total_spent) : 0,
        last_visit: customer.last_visit || null,
        notes: notesPayload,
      };

      let savedCust: any = null;

      if (customer.id) {
        const { data: updated, error: updateError } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", customer.id)
          .select();

        if (!updateError && updated && updated.length > 0) {
          savedCust = updated[0];
        }

        // If duplicate phone error (23505), another record in Supabase already has this phone!
        if (!savedCust && updateError && (updateError.code === "23505" || updateError.message?.includes("customers_phone_key"))) {
          const { data: existingByPhone } = await supabase
            .from("customers")
            .select("*")
            .eq("phone", standardPhone)
            .maybeSingle();

          if (existingByPhone) {
            const { data: mergedCust } = await supabase
              .from("customers")
              .update(payload)
              .eq("id", existingByPhone.id)
              .select();

            savedCust = Array.isArray(mergedCust) && mergedCust.length > 0 ? mergedCust[0] : existingByPhone;
          }
        }
      }

      if (!savedCust) {
        // Check if existing record exists by phone before attempting insert (prevents foreign key 23503 error on upsert)
        const { data: existingByPhone } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", standardPhone)
          .maybeSingle();

        if (existingByPhone) {
          const { data: updatedByPhone } = await supabase
            .from("customers")
            .update(payload)
            .eq("id", existingByPhone.id)
            .select();

          savedCust = Array.isArray(updatedByPhone) && updatedByPhone.length > 0 ? updatedByPhone[0] : existingByPhone;
        } else {
          const insertId = customer.id && isValidUUID(customer.id) ? customer.id : undefined;
          const { data, error } = await supabase
            .from("customers")
            .upsert({ ...(insertId ? { id: insertId } : {}), ...payload }, { onConflict: "phone" })
            .select();

          if (error) {
            console.error("Supabase saveCustomer error:", error);
            return null;
          }
          savedCust = Array.isArray(data) ? data[0] : data;
        }
      }

      // Synchronize all invoices in Supabase linked to this customer
      const finalId = savedCust?.id || customer.id;
      if (finalId) {
        await supabase
          .from("invoices")
          .update({
            customer_name: payload.name,
            customer_phone: payload.phone,
            customer_email: payload.email || "",
            customer_gender: payload.gender,
          })
          .eq("customer_id", finalId);
      }
      if (standardPhone && standardPhone.length >= 7) {
        await supabase
          .from("invoices")
          .update({
            customer_name: payload.name,
            customer_phone: payload.phone,
            customer_email: payload.email || "",
            customer_gender: payload.gender,
          })
          .eq("customer_phone", standardPhone);
      }

      if (savedCust) {
        let userNotes = savedCust.notes || "";
        let finalUpdatedAt = updatedAtIso;
        let lastReminderSentAt = customer.last_reminder_sent_at || savedCust.last_reminder_sent_at || undefined;
        let reminderHistory = customer.reminder_history || savedCust.reminder_history || [];

        if (savedCust.notes && typeof savedCust.notes === "string" && savedCust.notes.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(savedCust.notes);
            if (parsed.updated_at) finalUpdatedAt = parsed.updated_at;
            if (parsed.text !== undefined) userNotes = parsed.text;
            if (parsed.last_reminder_sent_at) lastReminderSentAt = parsed.last_reminder_sent_at;
            if (parsed.reminder_history && Array.isArray(parsed.reminder_history)) {
              reminderHistory = parsed.reminder_history;
            }
          } catch {}
        }
        return {
          ...savedCust,
          notes: userNotes,
          updated_at: finalUpdatedAt,
          last_reminder_sent_at: lastReminderSentAt || undefined,
          reminder_history: reminderHistory,
        };
      }

      return null;
    } catch (err) {
      console.error("Supabase saveCustomer exception:", err);
      return null;
    }
  },

  async deleteCustomer(id: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) console.error("Supabase deleteCustomer error:", error);
    } catch (err) {
      console.error("Supabase deleteCustomer error:", err);
    }
  },

  // 8. EXPENSES SYNC
  async saveExpense(expense: Expense) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data } = await supabase.from("expenses").upsert(expense).select().single();
      return data;
    } catch (err) {
      console.error("Supabase saveExpense error:", err);
      return null;
    }
  },

  async deleteExpense(expenseId: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("expenses").delete().eq("id", expenseId);
    } catch (err) {
      console.error("Supabase deleteExpense error:", err);
    }
  },

  // 9. SETTINGS SYNC
  async saveSettings(settings: SalonSettings) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      await supabase.from("salon_settings").upsert(settings);
    } catch (err) {
      console.error("Supabase saveSettings error:", err);
    }
  },

  // 10. WHEEL INVENTORY SYNC
  async loadWheelInventory(): Promise<WheelInventoryItem[]> {
    if (!isSupabaseConfigured() || !supabase) return Storage.getWheelInventory();
    try {
      const { data, error } = await supabase.from("wheel_inventory").select("*").order("created_at");
      if (error || !data || data.length === 0) {
        return Storage.getWheelInventory();
      }
      Storage.saveWheelInventory(data);
      return data;
    } catch {
      return Storage.getWheelInventory();
    }
  },

  async saveWheelInventoryItem(item: WheelInventoryItem): Promise<WheelInventoryItem | null> {
    Storage.saveWheelInventoryItem(item);
    if (!isSupabaseConfigured() || !supabase) return item;
    try {
      const { data, error } = await supabase.from("wheel_inventory").upsert(item).select().single();
      if (error) {
        console.error("Supabase saveWheelInventoryItem error:", error);
        return item;
      }
      return data;
    } catch (err) {
      console.error("Supabase saveWheelInventoryItem exception:", err);
      return item;
    }
  },

  async decrementWheelInventoryQuantity(itemId: string): Promise<WheelInventoryItem | null> {
    const localUpdated = Storage.decrementWheelInventoryStock(itemId);
    if (!isSupabaseConfigured() || !supabase) return localUpdated;
    try {
      const { data: current, error: fetchErr } = await supabase
        .from("wheel_inventory")
        .select("quantity")
        .eq("id", itemId)
        .single();
      if (fetchErr || !current) {
        if (localUpdated) {
          await supabase.from("wheel_inventory").upsert(localUpdated);
        }
        return localUpdated;
      }
      const newQty = Math.max(0, current.quantity - 1);
      const { data, error } = await supabase
        .from("wheel_inventory")
        .update({ quantity: newQty })
        .eq("id", itemId)
        .select()
        .single();
      if (!error && data) {
        Storage.saveWheelInventoryItem(data);
        return data;
      }
      return localUpdated;
    } catch (err) {
      console.error("Supabase decrementWheelInventoryQuantity error:", err);
      return localUpdated;
    }
  },

  async deleteWheelInventoryItem(itemId: string): Promise<void> {
    Storage.deleteWheelInventoryItem(itemId);
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("wheel_inventory").delete().eq("id", itemId);
    } catch (err) {
      console.error("Supabase deleteWheelInventoryItem error:", err);
    }
  },

  // 11. SUBSCRIBE TO REALTIME BROADCASTS
  subscribeToRealtimeUpdates(onUpdate: () => void) {
    if (!isSupabaseConfigured() || !supabase) return () => {};

    const channel = supabase
      .channel("salon_live_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_items" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_settings" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_users" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, onUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "wheel_inventory" }, onUpdate)
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  },
};
