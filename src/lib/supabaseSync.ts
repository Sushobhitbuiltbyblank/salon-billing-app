import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { DEFAULT_USERS } from "./storage";
import {
  AppUser,
  CatalogItem,
  Category,
  Customer,
  Expense,
  Invoice,
  ItemType,
  SalonSettings,
  Staff,
} from "@/types";

export const SupabaseSync = {
  // 1. FETCH ALL DATA FROM SUPABASE
  async loadAllData() {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const [
        settingsRes,
        staffRes,
        categoriesRes,
        catalogRes,
        customersRes,
        invoicesRes,
        expensesRes,
        usersRes,
      ] = await Promise.all([
        supabase.from("salon_settings").select("*").single(),
        supabase.from("staff").select("*").order("name"),
        supabase.from("categories").select("*").order("name"),
        supabase.from("catalog_items").select("*").order("name"),
        supabase.from("customers").select("*").order("total_visits", { ascending: false }),
        supabase.from("invoices").select("*, invoice_items(*)").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("app_users").select("*").order("role"),
      ]);

      return {
        settings: settingsRes.data || null,
        staff: (staffRes.data || []).map((s: any) => {
          let parsedNotes = s.notes || "";
          let commission_type: "percent" | "fixed" = "percent";
          let product_commission_rate = Number(s.commission_rate) || 0;
          let product_commission_type: "percent" | "fixed" = "percent";

          try {
            if (s.notes && s.notes.startsWith("{")) {
              const meta = JSON.parse(s.notes);
              commission_type = meta.commission_type || "percent";
              product_commission_rate = meta.product_commission_rate !== undefined ? Number(meta.product_commission_rate) : (Number(s.commission_rate) || 0);
              product_commission_type = meta.product_commission_type || "percent";
              parsedNotes = meta.custom_notes || "";
            }
          } catch (e) {
            // regular string note
          }

          return {
            ...s,
            commission_rate: Number(s.commission_rate) || 0,
            commission_type,
            product_commission_rate,
            product_commission_type,
            notes: parsedNotes,
          };
        }),
        categories: (categoriesRes.data || []).map((cat: any) => {
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
        }),
        catalog: (catalogRes.data || []).map((c: any) => {
          let itemType: ItemType = c.type;
          let package_service_ids: string[] | undefined = c.package_service_ids;
          let package_regular_price: number | undefined = c.package_regular_price ? Number(c.package_regular_price) : undefined;
          let sku = c.sku;

          // Decode backward-compatible package metadata from SKU
          if (c.sku && typeof c.sku === "string" && c.sku.startsWith("PKG_META:")) {
            try {
              const jsonStr = c.sku.replace("PKG_META:", "");
              const meta = JSON.parse(jsonStr);
              itemType = "package";
              package_service_ids = meta.package_service_ids || [];
              package_regular_price = Number(meta.package_regular_price) || Number(c.price);
              sku = "";
            } catch (e) {
              console.warn("Failed to parse package metadata from SKU:", e);
            }
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
        }),
        customers: (customersRes.data || []).map((cust: any) => ({
          ...cust,
          total_spent: Number(cust.total_spent) || 0,
        })),
        invoices: (invoicesRes.data || []).map((inv: any) => ({
          ...inv,
          subtotal: Number(inv.subtotal) || 0,
          tax_amount: Number(inv.tax_amount) || 0,
          discount_amount: Number(inv.discount_amount) || 0,
          grand_total: Number(inv.grand_total) || 0,
          items: (inv.invoice_items || []).map((it: any) => ({
            ...it,
            unit_price: Number(it.unit_price) || 0,
            discount: Number(it.discount) || 0,
            total_price: Number(it.total_price) || 0,
          })),
        })),
        expenses: (expensesRes.data || []).map((e: any) => ({
          ...e,
          amount: Number(e.amount) || 0,
        })),
        users: (() => {
          const remoteUsers = (usersRes.data || []) as AppUser[];
          const list = [...remoteUsers];
          // Ensure Sushobhit, Prabhat, and Amit always exist
          if (!list.some((u) => u.id === "usr-admin-01")) {
            list.unshift(DEFAULT_USERS[0]);
          }
          if (!list.some((u) => u.id === "usr-admin-02")) {
            list.splice(1, 0, DEFAULT_USERS[1]);
          }
          if (!list.some((u) => u.id === "usr-rec-01")) {
            list.push(DEFAULT_USERS[2]);
          }
          return list;
        })(),
      };
    } catch (err) {
      console.warn("Supabase fetch error, falling back to local storage:", err);
      return null;
    }
  },

  // 2. CREATE INVOICE IN SUPABASE
  async createInvoice(invoice: Invoice) {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const isValidUUID = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      // Sanitize header to match exact columns of 'invoices' table
      const invoiceHeader = {
        id: isValidUUID(invoice.id) ? invoice.id : undefined,
        invoice_number: invoice.invoice_number,
        customer_id: isValidUUID(invoice.customer_id) ? invoice.customer_id : null,
        customer_name: invoice.customer_name || "Walk-in Guest",
        customer_phone: invoice.customer_phone || null,
        subtotal: Number(invoice.subtotal) || 0,
        discount_amount: Number(invoice.discount_amount) || 0,
        discount_type: invoice.discount_type || "flat",
        discount_value: Number(invoice.discount_value) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
        tax_rate: Number(invoice.tax_rate) || 0,
        grand_total: Number(invoice.grand_total) || 0,
        payment_mode: invoice.payment_mode || "cash",
        payment_breakdown: invoice.payment_breakdown || null,
        status: invoice.status || "paid",
        notes: invoice.notes || null,
        created_at: invoice.created_at || new Date().toISOString(),
      };

      const { data: createdInv, error: invError } = await supabase
        .from("invoices")
        .upsert(invoiceHeader)
        .select()
        .single();

      if (invError) {
        console.error("Supabase createInvoice error:", invError);
        throw invError;
      }

      const invId = createdInv.id;

      // Insert line items with sanitized columns matching 'invoice_items' table
      if (invoice.items && invoice.items.length > 0) {
        const lineItemsPayload = invoice.items.map((item) => ({
          id: isValidUUID(item.id) ? item.id : undefined,
          invoice_id: invId,
          item_id: isValidUUID(item.item_id) ? item.item_id : null,
          item_name: item.item_name,
          item_type: item.item_type === "product" ? "product" : "service",
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          discount: Number(item.discount) || 0,
          total_price: Number(item.total_price) || 0,
          primary_staff_id: isValidUUID(item.primary_staff_id) ? item.primary_staff_id : null,
          secondary_staff_id: isValidUUID(item.secondary_staff_id) ? item.secondary_staff_id : null,
          primary_split_ratio: Number(item.primary_split_ratio) || 100,
          secondary_split_ratio: Number(item.secondary_split_ratio) || 0,
        }));

        const { error: itemsError } = await supabase.from("invoice_items").upsert(lineItemsPayload);
        if (itemsError) {
          console.error("Supabase invoice_items upsert error:", itemsError);
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

      // 1. Update invoice header
      const invoiceHeader = {
        invoice_number: invoice.invoice_number,
        customer_id: isValidUUID(invoice.customer_id) ? invoice.customer_id : null,
        customer_name: invoice.customer_name || "Walk-in Guest",
        customer_phone: invoice.customer_phone || null,
        subtotal: Number(invoice.subtotal) || 0,
        discount_amount: Number(invoice.discount_amount) || 0,
        discount_type: invoice.discount_type || "flat",
        discount_value: Number(invoice.discount_value) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
        tax_rate: Number(invoice.tax_rate) || 0,
        grand_total: Number(invoice.grand_total) || 0,
        payment_mode: invoice.payment_mode || "cash",
        payment_breakdown: invoice.payment_breakdown || null,
        status: invoice.status || "paid",
        notes: invoice.notes || null,
      };

      const { data: updatedInv, error: invError } = await supabase
        .from("invoices")
        .update(invoiceHeader)
        .eq("id", invoice.id)
        .select()
        .single();

      if (invError) {
        console.error("Supabase updateInvoice error:", invError);
        throw invError;
      }

      // 2. Synchronize line items (delete previous items for this invoice and insert updated items)
      if (invoice.items) {
        await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);

        if (invoice.items.length > 0) {
          const lineItemsPayload = invoice.items.map((item) => ({
            id: isValidUUID(item.id) ? item.id : undefined,
            invoice_id: invoice.id,
            item_id: isValidUUID(item.item_id) ? item.item_id : null,
            item_name: item.item_name,
            item_type: item.item_type === "product" ? "product" : "service",
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            discount: Number(item.discount) || 0,
            total_price: Number(item.total_price) || 0,
            primary_staff_id: isValidUUID(item.primary_staff_id) ? item.primary_staff_id : null,
            secondary_staff_id: isValidUUID(item.secondary_staff_id) ? item.secondary_staff_id : null,
            primary_split_ratio: Number(item.primary_split_ratio) || 100,
            secondary_split_ratio: Number(item.secondary_split_ratio) || 0,
          }));

          const { error: itemsError } = await supabase.from("invoice_items").insert(lineItemsPayload);
          if (itemsError) {
            console.error("Supabase invoice_items re-insert error:", itemsError);
          }
        }
      }

      return updatedInv;
    } catch (err) {
      console.error("Supabase updateInvoice error:", err);
      return null;
    }
  },

  async voidInvoice(invoiceId: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("invoices").update({ status: "void" }).eq("id", invoiceId);
    } catch (err) {
      console.error("Supabase voidInvoice error:", err);
    }
  },

  async deleteInvoice(invoiceId: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      await supabase.from("invoices").delete().eq("id", invoiceId);
    } catch (err) {
      console.error("Supabase deleteInvoice error:", err);
    }
  },

  // 3. STAFF SYNC
  async saveStaff(staffMember: Staff) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const incentiveMeta = {
        commission_type: staffMember.commission_type || "percent",
        product_commission_rate: staffMember.product_commission_rate ?? staffMember.commission_rate,
        product_commission_type: staffMember.product_commission_type || "percent",
        custom_notes: staffMember.notes || "",
      };

      const payload = {
        id: staffMember.id,
        name: staffMember.name,
        phone: staffMember.phone || null,
        role: staffMember.role,
        commission_rate: Number(staffMember.commission_rate) || 0,
        status: staffMember.status,
        color: staffMember.color || null,
        notes: JSON.stringify(incentiveMeta),
      };

      const { data, error } = await supabase.from("staff").upsert(payload).select().single();
      if (error) {
        console.error("Supabase saveStaff error:", error);
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
      // 1. First attempt direct upsert
      const { data, error } = await supabase.from("catalog_items").upsert(item).select().single();
      if (!error) return data;

      console.warn("Supabase direct saveCatalogItem failed, attempting backward-compatible payload:", error.message);

      // 2. Compatibility fallback: encode package metadata in SKU so Postgres accepts it
      const compatPayload = {
        id: item.id,
        category_id: item.category_id || null,
        name: item.name,
        type: item.type === "package" ? "service" : item.type,
        price: Number(item.price) || 0,
        duration_mins: item.duration_mins || 30,
        cost_price: Number(item.cost_price) || 0,
        sku:
          item.type === "package"
            ? `PKG_META:${JSON.stringify({
                package_service_ids: item.package_service_ids || [],
                package_regular_price: item.package_regular_price || item.price,
              })}`
            : item.sku || null,
        is_active: item.is_active !== false,
        created_at: item.created_at || new Date().toISOString(),
      };

      const { data: compatData, error: compatError } = await supabase
        .from("catalog_items")
        .upsert(compatPayload)
        .select()
        .single();

      if (compatError) {
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
    try {
      const isValidUUID = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      const payload = {
        id: isValidUUID(customer.id) ? customer.id : undefined,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        gender: customer.gender || "unspecified",
        birthday: customer.birthday || null,
        anniversary: customer.anniversary || null,
        total_visits: Number(customer.total_visits) || 1,
        total_spent: Number(customer.total_spent) || 0,
        last_visit: customer.last_visit || new Date().toISOString(),
        notes: customer.notes || null,
        created_at: customer.created_at || new Date().toISOString(),
      };

      const { data, error } = await supabase.from("customers").upsert(payload).select().single();
      if (error) console.error("Supabase saveCustomer error:", error);
      return data;
    } catch (err) {
      console.error("Supabase saveCustomer error:", err);
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

  // 10. SUBSCRIBE TO REALTIME BROADCASTS
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
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  },
};
