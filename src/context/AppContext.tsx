"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  AppTab,
  AppUser,
  CatalogItem,
  Category,
  Customer,
  DiscountType,
  Expense,
  Invoice,
  InvoiceItem,
  PackageServiceItem,
  SalonSettings,
  Staff,
  StaffStatus,
  AttendanceRecord,
  AttendanceStatus,
} from "@/types";
import { Storage, initStorage, DEFAULT_SETTINGS, DEFAULT_USERS } from "@/lib/storage";
import { SupabaseSync } from "@/lib/supabaseSync";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { calculateItemTotal } from "@/lib/calculations";
import { normalizePhoneNumber } from "@/lib/customerUtils";

interface AppContextType {
  users: AppUser[];
  currentUser: AppUser | null;
  loginWithPin: (userId: string, pin: string) => boolean;
  loginWithEmailAndPin: (email: string, pin: string) => { success: boolean; error?: string };
  loginAs: (user: AppUser) => void;
  logout: () => void;
  saveUser: (user: AppUser) => void;
  deleteUser: (userId: string) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;

  // SETTINGS
  settings: SalonSettings;
  updateSettings: (newSettings: SalonSettings) => void;
  
  // STAFF CRUD & ATTENDANCE
  staff: Staff[];
  addStaff: (staffMember: Staff) => Staff;
  updateStaff: (staffMember: Staff) => void;
  deleteStaff: (staffId: string) => void;
  toggleStaffStatus: (staffId: string) => void;
  setStaffDailyStatus: (staffId: string, status: StaffStatus) => void;
  attendance: AttendanceRecord[];
  markStaffAttendance: (staffId: string, date: string, status: AttendanceStatus, notes?: string) => AttendanceRecord;
  
  // CATEGORIES CRUD
  categories: Category[];
  addCategory: (category: Category) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;

  // CATALOG CRUD
  catalog: CatalogItem[];
  addCatalogItem: (item: CatalogItem) => void;
  saveCatalogItem: (item: CatalogItem) => void;
  deleteCatalogItem: (itemId: string) => void;
  
  // CUSTOMERS
  customers: Customer[];
  saveCustomer: (customer: Customer) => Customer;
  deleteCustomer: (customerId: string) => void;
  
  // INVOICES
  invoices: Invoice[];
  createInvoice: (invoice: Invoice) => Invoice;
  updateInvoice: (invoice: Invoice) => Promise<Invoice>;
  voidInvoice: (invoiceId: string) => void;
  deleteInvoice: (invoiceId: string) => void;
  editingInvoice: Invoice | null;
  setEditingInvoice: (invoice: Invoice | null) => void;
  
  // EXPENSES
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;

  // NAVIGATION TABS
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // POS DRAFT STATE
  draftCustomer: Partial<Customer> | null;
  setDraftCustomer: (cust: Partial<Customer> | null) => void;
  draftItems: InvoiceItem[];
  addDraftItem: (item: CatalogItem, defaultStaffId?: string) => void;
  updateDraftItem: (itemId: string, updates: Partial<InvoiceItem>) => void;
  removeDraftItem: (itemId: string) => void;
  clearDraft: () => void;
  draftDiscountType: DiscountType;
  setDraftDiscountType: (type: DiscountType) => void;
  draftDiscountValue: number;
  setDraftDiscountValue: (val: number) => void;
  draftNotes: string;
  setDraftNotes: (notes: string) => void;

  // PRINT / RECEIPT MODAL STATE
  printInvoice: Invoice | null;
  setPrintInvoice: (invoice: Invoice | null) => void;

  // WHATSAPP DIGITAL BILL MODAL STATE
  whatsAppInvoice: Invoice | null;
  setWhatsAppInvoice: (invoice: Invoice | null) => void;

  // GLOBAL ACTIONS
  resetDemoData: () => void;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);

  const [settings, setSettings] = useState<SalonSettings>(DEFAULT_SETTINGS);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  const [activeTab, setActiveTab] = useState<AppTab>("pos");

  // DRAFT POS STATE
  const [draftCustomer, setDraftCustomer] = useState<Partial<Customer> | null>(null);
  const [draftItems, setDraftItems] = useState<InvoiceItem[]>([]);
  const [draftDiscountType, setDraftDiscountType] = useState<DiscountType>("flat");
  const [draftDiscountValue, setDraftDiscountValue] = useState<number>(0);
  const [draftNotes, setDraftNotes] = useState<string>("");

  // PRINT & EDIT & WHATSAPP MODAL
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);

  const initialLoadedRef = useRef(false);

  const loadAllData = useCallback(async () => {
    if (typeof window === "undefined") return;

    // 1. Initial instant load from local cache (runs once on startup)
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      initStorage();
      const resetResult = Storage.checkAndResetDailyStaffStatus();

      const cachedUsers = Storage.getUsers();
      const cachedCurrent = Storage.getCurrentUser();
      setUsers(cachedUsers);
      setCurrentUser(cachedCurrent);
      if (!cachedCurrent) {
        setIsAuthModalOpen(true);
      }
      setSettings(Storage.getSettings());
      setStaff(resetResult.staff);
      setCategories(Storage.getCategories());
      setCatalog(Storage.getCatalog());
      setCustomers(Storage.getCustomers());
      setInvoices(Storage.getInvoices());
      setExpenses(Storage.getExpenses());
      setAttendance(Storage.getAttendance());

      if (resetResult.didReset && isSupabaseConfigured()) {
        resetResult.staff.forEach((st) => SupabaseSync.saveStaff(st));
      }
    } else {
      // Check if day rolled over while app was running or tab was idle
      const resetResult = Storage.checkAndResetDailyStaffStatus();
      if (resetResult.didReset) {
        setStaff(resetResult.staff);
        if (isSupabaseConfigured()) {
          resetResult.staff.forEach((st) => SupabaseSync.saveStaff(st));
        }
      }
    }

    // 2. If Supabase configured, sync from remote PostgreSQL in background
    if (isSupabaseConfigured()) {
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData) {
        if (cloudData.settings) {
          setSettings((prev) => (JSON.stringify(prev) !== JSON.stringify(cloudData.settings) ? cloudData.settings : prev));
          Storage.saveSettings(cloudData.settings);
        }
        if (cloudData.staff) {
          setStaff((prev) => (JSON.stringify(prev) !== JSON.stringify(cloudData.staff) ? cloudData.staff : prev));
          Storage.saveStaff(cloudData.staff);
        }
        if (cloudData.categories) {
          setCategories((prev) =>
            JSON.stringify(prev) !== JSON.stringify(cloudData.categories) ? cloudData.categories! : prev
          );
          Storage.saveCategories(cloudData.categories);
        }

        if (cloudData.catalog) {
          setCatalog((prev) =>
            JSON.stringify(prev) !== JSON.stringify(cloudData.catalog) ? cloudData.catalog! : prev
          );
          Storage.saveCatalog(cloudData.catalog);
        }
        if (cloudData.customers) {
          setCustomers((prev) => (JSON.stringify(prev) !== JSON.stringify(cloudData.customers) ? cloudData.customers : prev));
          Storage.saveCustomers(cloudData.customers);
        }
        if (cloudData.invoices) {
          setInvoices((prev) => (JSON.stringify(prev) !== JSON.stringify(cloudData.invoices) ? cloudData.invoices : prev));
          Storage.saveInvoices(cloudData.invoices);
        }
        if (cloudData.expenses) {
          setExpenses((prev) => (JSON.stringify(prev) !== JSON.stringify(cloudData.expenses) ? cloudData.expenses : prev));
          Storage.saveExpenses(cloudData.expenses);
        }
        if (cloudData.users) {
          setUsers((prev) => (JSON.stringify(prev) !== JSON.stringify(cloudData.users) ? cloudData.users : prev));
          Storage.saveUsers(cloudData.users);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // 1. Subscribe to Supabase Realtime multi-device database events
    const unsubscribe = SupabaseSync.subscribeToRealtimeUpdates(() => {
      loadAllData();
    });

    // 2. Multi-device 4-second heartbeat polling fallback for iPad/tablets on background/wake
    const interval = setInterval(() => {
      loadAllData();
    }, 4000);

    // 3. Instant sync on window focus or screen unlock / tab switch
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadAllData();
      }
    };
    window.addEventListener("focus", loadAllData);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener("focus", loadAllData);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadAllData]);

  // AUTH ACTIONS
  const loginWithPin = (userId: string, pin: string): boolean => {
    const user = users.find((u) => u.id === userId && u.pin === pin);
    if (user) {
      setCurrentUser(user);
      Storage.setCurrentUser(user);
      setIsAuthModalOpen(false);
      return true;
    }
    return false;
  };

  const loginWithEmailAndPin = (email: string, pin: string): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!cleanPin || cleanPin.length < 4) {
      return { success: false, error: "Please enter a 4-digit PIN." };
    }

    // 1. Check existing registered staff / users
    const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      if (existingUser.pin === cleanPin) {
        setCurrentUser(existingUser);
        Storage.setCurrentUser(existingUser);
        setIsAuthModalOpen(false);
        return { success: true };
      } else {
        return { success: false, error: "Incorrect PIN for this registered account." };
      }
    }

    // 2. Otherwise log in as Visitor / Guest
    const namePart = cleanEmail.split("@")[0];
    const visitorName = namePart
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "Visitor";

    const visitorUser: AppUser = {
      id: `usr-visitor-${Date.now()}`,
      name: visitorName,
      email: cleanEmail,
      role: "receptionist",
      pin: cleanPin,
      avatar_color: "#10b981", // Emerald green for visitors
      is_active: true,
      created_at: new Date().toISOString(),
    };

    saveUser(visitorUser);
    setCurrentUser(visitorUser);
    Storage.setCurrentUser(visitorUser);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const loginAs = (user: AppUser) => {
    setCurrentUser(user);
    Storage.setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setCurrentUser(null);
    Storage.setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const saveUser = (user: AppUser) => {
    Storage.saveUser(user);
    setUsers(Storage.getUsers());
    if (currentUser?.id === user.id) {
      setCurrentUser(user);
    }
    if (isSupabaseConfigured()) {
      SupabaseSync.saveUser(user);
    }
  };

  const deleteUser = (userId: string) => {
    Storage.deleteUser(userId);
    setUsers(Storage.getUsers());
    if (isSupabaseConfigured()) {
      SupabaseSync.deleteUser(userId);
    }
  };

  // SETTINGS ACTIONS
  const updateSettings = (newSettings: SalonSettings) => {
    Storage.saveSettings(newSettings);
    setSettings(newSettings);
    if (isSupabaseConfigured()) {
      SupabaseSync.saveSettings(newSettings);
    }
  };

  // STAFF CRUD ACTIONS
  const addStaff = (staffMember: Staff): Staff => {
    const created = Storage.addStaffMember(staffMember);
    setStaff(Storage.getStaff());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveStaff(created);
    }
    return created;
  };

  const updateStaff = (staffMember: Staff) => {
    Storage.updateStaffMember(staffMember);
    setStaff(Storage.getStaff());

    // Record today's attendance for consistency if staff status exists
    const today = new Date().toISOString().slice(0, 10);
    const todayLocale = new Date().toLocaleDateString("en-CA");
    const attStatus: AttendanceStatus =
      staffMember.status === "active"
        ? "present"
        : staffMember.status === "half_day"
        ? "half_day"
        : staffMember.status === "on_leave"
        ? "on_leave"
        : staffMember.status === "weekly_off"
        ? "weekly_off"
        : "on_leave";

    Storage.markAttendance(staffMember.id, today, attStatus, undefined, staffMember.name);
    if (todayLocale !== today) {
      Storage.markAttendance(staffMember.id, todayLocale, attStatus, undefined, staffMember.name);
    }
    setAttendance(Storage.getAttendance());

    if (isSupabaseConfigured()) {
      SupabaseSync.saveStaff(staffMember);
    }
  };

  const deleteStaff = (staffId: string) => {
    Storage.deleteStaffMember(staffId);
    setStaff(Storage.getStaff());
    if (isSupabaseConfigured()) {
      SupabaseSync.deleteStaff(staffId);
    }
  };

  const markStaffAttendance = (
    staffId: string,
    date: string,
    status: AttendanceStatus,
    notes?: string
  ): AttendanceRecord => {
    const staffMember = staff.find((s) => s.id === staffId);
    const rec = Storage.markAttendance(staffId, date, status, notes, staffMember?.name);
    setAttendance(Storage.getAttendance());
    setStaff(Storage.getStaff());

    // Also sync to Supabase staff if date is today
    const isToday =
      date === new Date().toISOString().slice(0, 10) ||
      date === new Date().toLocaleDateString("en-CA");
    if (isToday && isSupabaseConfigured()) {
      const updatedStaff = Storage.getStaff().find((s) => s.id === staffId);
      if (updatedStaff) {
        SupabaseSync.saveStaff(updatedStaff);
      }
    }
    return rec;
  };

  const setStaffDailyStatus = (staffId: string, status: StaffStatus) => {
    const list = [...staff];
    const target = list.find((s) => s.id === staffId);
    if (target) {
      target.status = status;
      Storage.saveStaff(list);
      setStaff([...list]);

      // Automatically log today's attendance entry across UTC & Local day
      const today = new Date().toISOString().slice(0, 10);
      const todayLocale = new Date().toLocaleDateString("en-CA");
      const attStatus: AttendanceStatus =
        status === "active"
          ? "present"
          : status === "half_day"
          ? "half_day"
          : status === "on_leave"
          ? "on_leave"
          : status === "weekly_off"
          ? "weekly_off"
          : "on_leave";

      Storage.markAttendance(staffId, today, attStatus, undefined, target.name);
      if (todayLocale !== today) {
        Storage.markAttendance(staffId, todayLocale, attStatus, undefined, target.name);
      }
      setAttendance(Storage.getAttendance());

      if (isSupabaseConfigured()) {
        SupabaseSync.saveStaff(target);
      }
    }
  };

  const toggleStaffStatus = (staffId: string) => {
    const list = [...staff];
    const target = list.find((s) => s.id === staffId);
    if (target) {
      // Cycle: active -> half_day -> on_leave -> weekly_off -> active
      const nextStatus: StaffStatus =
        target.status === "active"
          ? "half_day"
          : target.status === "half_day"
          ? "on_leave"
          : target.status === "on_leave"
          ? "weekly_off"
          : "active";
      setStaffDailyStatus(staffId, nextStatus);
    }
  };

  const addCategory = async (category: Category) => {
    Storage.saveCategory(category);
    setCategories((prev) => [...prev.filter((c) => c.id !== category.id), category]);
    if (isSupabaseConfigured()) {
      await SupabaseSync.saveCategory(category);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.categories) {
        setCategories(cloudData.categories);
        Storage.saveCategories(cloudData.categories);
      }
    }
  };

  const saveCategory = async (category: Category) => {
    Storage.saveCategory(category);
    setCategories(Storage.getCategories());
    if (isSupabaseConfigured()) {
      await SupabaseSync.saveCategory(category);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.categories) {
        setCategories(cloudData.categories);
        Storage.saveCategories(cloudData.categories);
      }
    }
  };

  const deleteCategory = async (categoryId: string) => {
    Storage.deleteCategory(categoryId);
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    if (isSupabaseConfigured()) {
      await SupabaseSync.deleteCategory(categoryId);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.categories) {
        setCategories(cloudData.categories);
        Storage.saveCategories(cloudData.categories);
      }
    }
  };

  // CATALOG CRUD ACTIONS
  const addCatalogItem = async (item: CatalogItem) => {
    if (isSupabaseConfigured()) {
      await SupabaseSync.saveCatalogItem(item);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.catalog) {
        setCatalog(cloudData.catalog);
        Storage.saveCatalog(cloudData.catalog);
      }
    } else {
      Storage.saveCatalogItem(item);
      setCatalog((prev) => [...prev.filter((i) => i.id !== item.id), item]);
    }
  };

  const saveCatalogItem = async (item: CatalogItem) => {
    if (isSupabaseConfigured()) {
      await SupabaseSync.saveCatalogItem(item);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.catalog) {
        setCatalog(cloudData.catalog);
        Storage.saveCatalog(cloudData.catalog);
      }
    } else {
      Storage.saveCatalogItem(item);
      setCatalog((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [...prev, item];
      });
    }
  };

  const deleteCatalogItem = async (itemId: string) => {
    if (isSupabaseConfigured()) {
      await SupabaseSync.deleteCatalogItem(itemId);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.catalog) {
        setCatalog(cloudData.catalog);
        Storage.saveCatalog(cloudData.catalog);
      }
    } else {
      Storage.deleteCatalogItem(itemId);
      setCatalog((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  // CUSTOMER ACTIONS
  const saveCustomer = (cust: Customer): Customer => {
    const saved = Storage.saveCustomer(cust);
    setCustomers(Storage.getCustomers());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveCustomer(saved).then((remoteCust) => {
        if (remoteCust) {
          const fresh = Storage.getCustomers();
          const p = normalizePhoneNumber(remoteCust.phone);
          const idx = fresh.findIndex((c) => normalizePhoneNumber(c.phone) === p);
          if (idx >= 0) {
            fresh[idx] = { ...fresh[idx], ...remoteCust };
            Storage.saveCustomers(fresh);
            setCustomers(fresh);
          }
        }
      });
    }
    return saved;
  };

  const deleteCustomer = (customerId: string) => {
    Storage.deleteCustomer(customerId);
    setCustomers(Storage.getCustomers());
    if (isSupabaseConfigured()) {
      SupabaseSync.deleteCustomer(customerId);
    }
  };

  // INVOICE ACTIONS
  const createInvoice = (inv: Invoice): Invoice => {
    const created = Storage.createInvoice(inv);
    setInvoices(Storage.getInvoices());
    setCustomers(Storage.getCustomers());
    if (isSupabaseConfigured()) {
      SupabaseSync.createInvoice(created).then((remoteInv) => {
        if (remoteInv) {
          loadAllData();
        }
      });
    }
    return created;
  };

  const updateInvoice = async (inv: Invoice): Promise<Invoice> => {
    const updated = Storage.updateInvoice(inv);
    setInvoices(Storage.getInvoices());
    if (isSupabaseConfigured()) {
      await SupabaseSync.updateInvoice(inv);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.invoices) {
        setInvoices(cloudData.invoices);
        Storage.saveInvoices(cloudData.invoices);
      }
      if (cloudData?.customers) {
        setCustomers(cloudData.customers);
        Storage.saveCustomers(cloudData.customers);
      }
    }
    return updated;
  };

  const voidInvoice = async (invoiceId: string) => {
    Storage.voidInvoice(invoiceId);
    setInvoices(Storage.getInvoices());
    if (isSupabaseConfigured()) {
      await SupabaseSync.voidInvoice(invoiceId);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.invoices) {
        setInvoices(cloudData.invoices);
        Storage.saveInvoices(cloudData.invoices);
      }
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (currentUser?.role !== "admin") {
      alert("Permission Denied: Only Admin can permanently delete invoices.");
      return;
    }
    // 1. Instantly delete from local state & storage for immediate UI response
    Storage.deleteInvoice(invoiceId);
    setInvoices(Storage.getInvoices());

    // 2. Delete from Supabase PostgreSQL
    if (isSupabaseConfigured()) {
      await SupabaseSync.deleteInvoice(invoiceId);
      const cloudData = await SupabaseSync.loadAllData();
      if (cloudData?.invoices) {
        setInvoices(cloudData.invoices);
        Storage.saveInvoices(cloudData.invoices);
      }
    }
  };

  // EXPENSE ACTIONS
  const addExpense = (expense: Expense) => {
    Storage.addExpense(expense);
    setExpenses(Storage.getExpenses());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveExpense(expense);
    }
  };

  const deleteExpense = (expenseId: string) => {
    Storage.deleteExpense(expenseId);
    setExpenses(Storage.getExpenses());
    if (isSupabaseConfigured()) {
      SupabaseSync.deleteExpense(expenseId);
    }
  };

  // POS DRAFT HELPERS
  const addDraftItem = (item: CatalogItem, defaultStaffId?: string) => {
    const primaryStaffId = defaultStaffId || undefined;

    setDraftItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.item_id === item.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.quantity + 1;
        const newTotal = calculateItemTotal(current.unit_price, newQty, current.discount);
        updated[existingIdx] = {
          ...current,
          quantity: newQty,
          total_price: newTotal,
        };
        return updated;
      } else {
        // Build package_services breakdown if this is a package combo
        let packageServices: PackageServiceItem[] | undefined = undefined;
        let unitPrice = item.price;
        let discount = 0;
        let totalPrice = item.price;

        if (item.type === "package") {
          let includedServices: CatalogItem[] = [];

          if (item.package_service_ids && item.package_service_ids.length > 0) {
            includedServices = item.package_service_ids
              .map((sId) =>
                catalog.find(
                  (c) =>
                    c.id === sId ||
                    c.id.replace(/-/g, "").endsWith(sId) ||
                    c.id.replace(/-/g, "").startsWith(sId) ||
                    c.name.toLowerCase().trim() === sId.toLowerCase().trim()
                )
              )
              .filter(Boolean) as CatalogItem[];
          }

          // Fallback if IDs were not matched and name has "+"
          if (includedServices.length === 0 && item.name.includes("+")) {
            const parts = item.name.split("+").map((p) => p.trim().toLowerCase());
            includedServices = parts
              .map((p) =>
                catalog.find(
                  (c) =>
                    c.type !== "package" &&
                    (c.name.toLowerCase().trim() === p ||
                      c.name.toLowerCase().includes(p) ||
                      p.includes(c.name.toLowerCase()))
                )
              )
              .filter(Boolean) as CatalogItem[];
          }

          if (includedServices.length > 0) {
            // Keep billed value same as service actual value
            packageServices = includedServices.map((svc) => ({
              service_id: svc.id,
              service_name: svc.name,
              price: svc.price, // Billed value same as service actual value
              regular_price: svc.price,
              duration_mins: svc.duration_mins || 30,
              primary_staff_id: primaryStaffId,
              primary_split_ratio: 100,
              secondary_split_ratio: 0,
            }));

            const sumOfServices = includedServices.reduce((sum, s) => sum + s.price, 0);
            const packagePrice = item.price;

            if (packagePrice < sumOfServices) {
              // If package price is less than sum of service values, show difference on discount
              unitPrice = sumOfServices;
              discount = sumOfServices - packagePrice;
              totalPrice = packagePrice;
            } else {
              // If total value equal to sum of services actual value
              unitPrice = sumOfServices > 0 ? sumOfServices : packagePrice;
              discount = 0;
              totalPrice = unitPrice;
            }
          }
        }

        const newItem: InvoiceItem = {
          id: `draft-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          item_id: item.id,
          item_name: item.name,
          item_type: item.type,
          quantity: 1,
          unit_price: unitPrice,
          discount: discount,
          total_price: totalPrice,
          package_service_ids: item.package_service_ids,
          package_regular_price: item.package_regular_price || unitPrice,
          package_services: packageServices,
          primary_staff_id: primaryStaffId,
          primary_split_ratio: 100,
          secondary_split_ratio: 0,
        };
        return [newItem, ...prev];
      }
    });
  };

  const updateDraftItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const merged = { ...item, ...updates };
          merged.total_price = calculateItemTotal(
            merged.unit_price,
            merged.quantity,
            merged.discount
          );

          // If staff_splits exist and were not explicitly provided in this update, keep their split amounts in sync with net total_price
          if (merged.staff_splits && merged.staff_splits.length > 0 && !updates.staff_splits) {
            const totalSplit = merged.staff_splits.reduce((s, x) => s + (Number(x.amount) || 0), 0);
            merged.staff_splits = merged.staff_splits.map((sp) => {
              const ratio =
                sp.ratio !== undefined && !isNaN(sp.ratio)
                  ? sp.ratio
                  : totalSplit > 0
                  ? (Number(sp.amount) / totalSplit) * 100
                  : 100;
              return {
                ...sp,
                ratio,
                amount: Math.round((merged.total_price * ratio) / 100),
              };
            });
          }

          return merged;
        }
        return item;
      })
    );
  };

  const removeDraftItem = (itemId: string) => {
    setDraftItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const clearDraft = () => {
    setDraftCustomer(null);
    setDraftItems([]);
    setDraftDiscountType("flat");
    setDraftDiscountValue(0);
    setDraftNotes("");
  };

  const resetDemoData = () => {
    Storage.resetDemo();
    loadAllData();
    clearDraft();
  };

  return (
    <AppContext.Provider
      value={{
        users,
        currentUser,
        loginWithPin,
        loginWithEmailAndPin,
        loginAs,
        logout,
        saveUser,
        deleteUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        settings,
        updateSettings,
        staff,
        addStaff,
        updateStaff,
        deleteStaff,
        toggleStaffStatus,
        setStaffDailyStatus,
        attendance,
        markStaffAttendance,
        categories,
        addCategory,
        saveCategory,
        deleteCategory,
        catalog,
        addCatalogItem,
        saveCatalogItem,
        deleteCatalogItem,
        customers,
        saveCustomer,
        deleteCustomer,
        invoices,
        createInvoice,
        updateInvoice,
        voidInvoice,
        deleteInvoice,
        editingInvoice,
        setEditingInvoice,
        expenses,
        addExpense,
        deleteExpense,
        activeTab,
        setActiveTab,
        draftCustomer,
        setDraftCustomer,
        draftItems,
        addDraftItem,
        updateDraftItem,
        removeDraftItem,
        clearDraft,
        draftDiscountType,
        setDraftDiscountType,
        draftDiscountValue,
        setDraftDiscountValue,
        draftNotes,
        setDraftNotes,
        printInvoice,
        setPrintInvoice,
        whatsAppInvoice,
        setWhatsAppInvoice,
        resetDemoData,
        refreshData: loadAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
