"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  SalonSettings,
  Staff,
} from "@/types";
import { Storage, initStorage, DEFAULT_SETTINGS, DEFAULT_USERS } from "@/lib/storage";
import { SupabaseSync } from "@/lib/supabaseSync";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { calculateItemTotal } from "@/lib/calculations";

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
  
  // STAFF CRUD
  staff: Staff[];
  addStaff: (staffMember: Staff) => Staff;
  updateStaff: (staffMember: Staff) => void;
  deleteStaff: (staffId: string) => void;
  toggleStaffStatus: (staffId: string) => void;
  
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

  const loadAllData = useCallback(async () => {
    if (typeof window === "undefined") return;
    initStorage();
    
    // 1. Instant load from local cache
    const cachedUsers = Storage.getUsers();
    const cachedCurrent = Storage.getCurrentUser();
    setUsers(cachedUsers);
    setCurrentUser(cachedCurrent);
    if (!cachedCurrent) {
      setIsAuthModalOpen(true);
    }
    setSettings(Storage.getSettings());
    setStaff(Storage.getStaff());
    setCategories(Storage.getCategories());
    setCatalog(Storage.getCatalog());
    setCustomers(Storage.getCustomers());
    setInvoices(Storage.getInvoices());
    setExpenses(Storage.getExpenses());

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
          const localCats = Storage.getCategories();
          const remoteCats = cloudData.categories;
          const mergedCats = [...remoteCats];
          localCats.forEach((loc) => {
            if (!mergedCats.some((rem) => rem.id === loc.id || rem.name.toLowerCase().trim() === loc.name.toLowerCase().trim())) {
              mergedCats.push(loc);
            }
          });
          setCategories((prev) => (JSON.stringify(prev) !== JSON.stringify(mergedCats) ? mergedCats : prev));
          Storage.saveCategories(mergedCats);
        }
        if (cloudData.catalog) {
          const localCatalog = Storage.getCatalog();
          const remoteCatalog = cloudData.catalog;
          const mergedCatalog = [...remoteCatalog];
          localCatalog.forEach((loc) => {
            if (loc.type === "package" && !mergedCatalog.some((rem) => rem.id === loc.id)) {
              mergedCatalog.push(loc);
            }
          });
          setCatalog((prev) => (JSON.stringify(prev) !== JSON.stringify(mergedCatalog) ? mergedCatalog : prev));
          Storage.saveCatalog(mergedCatalog);
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

  const toggleStaffStatus = (staffId: string) => {
    const list = [...staff];
    const target = list.find((s) => s.id === staffId);
    if (target) {
      target.status = target.status === "active" ? "on_leave" : "active";
      Storage.saveStaff(list);
      setStaff([...list]);
      if (isSupabaseConfigured()) {
        SupabaseSync.saveStaff(target);
      }
    }
  };

  // CATEGORIES CRUD ACTIONS
  const addCategory = (category: Category) => {
    Storage.saveCategory(category);
    setCategories(Storage.getCategories());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveCategory(category);
    }
  };

  const saveCategory = (category: Category) => {
    Storage.saveCategory(category);
    setCategories(Storage.getCategories());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveCategory(category);
    }
  };

  const deleteCategory = (categoryId: string) => {
    Storage.deleteCategory(categoryId);
    setCategories(Storage.getCategories());
    if (isSupabaseConfigured()) {
      SupabaseSync.deleteCategory(categoryId);
    }
  };

  // CATALOG CRUD ACTIONS
  const addCatalogItem = (item: CatalogItem) => {
    Storage.saveCatalogItem(item);
    setCatalog(Storage.getCatalog());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveCatalogItem(item);
    }
  };

  const saveCatalogItem = (item: CatalogItem) => {
    Storage.saveCatalogItem(item);
    setCatalog(Storage.getCatalog());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveCatalogItem(item);
    }
  };

  const deleteCatalogItem = (itemId: string) => {
    Storage.deleteCatalogItem(itemId);
    setCatalog(Storage.getCatalog());
    if (isSupabaseConfigured()) {
      SupabaseSync.deleteCatalogItem(itemId);
    }
  };

  // CUSTOMER ACTIONS
  const saveCustomer = (cust: Customer): Customer => {
    const saved = Storage.saveCustomer(cust);
    setCustomers(Storage.getCustomers());
    if (isSupabaseConfigured()) {
      SupabaseSync.saveCustomer(saved);
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
        const newItem: InvoiceItem = {
          id: `draft-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          item_id: item.id,
          item_name: item.name,
          item_type: item.type,
          quantity: 1,
          unit_price: item.price,
          discount: 0,
          total_price: item.price,
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
