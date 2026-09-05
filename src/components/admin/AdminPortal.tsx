"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  AppUser,
  CatalogItem,
  Category,
  Customer,
  ItemType,
  SalonSettings,
  Staff,
  StaffStatus,
  AttendanceRecord,
  AttendanceStatus,
  IncentiveType,
} from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CustomerModal } from "@/components/customer/CustomerModal";
import { AdminAnalyticsDashboard } from "@/components/admin/AdminAnalyticsDashboard";
import { AdminInvoiceManagement } from "@/components/admin/AdminInvoiceManagement";
import { AdminRewardsManagement } from "@/components/admin/AdminRewardsManagement";
import { formatCurrency, formatDate, generateUUID } from "@/lib/utils";
import { unifyCustomerList, isCustomerInTimeframe, CustomerTimeframeFilter } from "@/lib/customerUtils";
import {
  Shield,
  Users,
  UserCheck,
  User,
  Package,
  Layers,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Scissors,
  Phone,
  Mail,
  Gift,
  Heart,
  Percent,
  Clock,
  KeyRound,
  Store,
  DollarSign,
  Search,
  CheckCircle2,
  Save,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  BarChart3,
  Receipt,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  UserX,
  AlertCircle,
  FileText,
  ArrowUpDown,
  TrendingUp,
  Printer,
  History,
} from "lucide-react";

export function AdminPortal() {
  const {
    currentUser,
    users,
    saveUser,
    deleteUser,
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleStaffStatus,
    setStaffDailyStatus,
    attendance,
    markStaffAttendance,
    catalog,
    addCatalogItem,
    saveCatalogItem,
    deleteCatalogItem,
    categories,
    addCategory,
    saveCategory,
    deleteCategory,
    customers,
    saveCustomer,
    deleteCustomer,
    invoices,
    setDraftCustomer,
    setActiveTab,
    setPrintInvoice,
    settings,
    updateSettings,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<
    "analytics" | "invoices" | "customers" | "staff" | "catalog" | "categories" | "rewards" | "users" | "settings"
  >("analytics");


  // ATTENDANCE & ROSTER STATE
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [isAttendanceLogModalOpen, setIsAttendanceLogModalOpen] = useState<boolean>(false);
  const [attendanceMonth, setAttendanceMonth] = useState<string>(
    () => new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [leaveNotesModal, setLeaveNotesModal] = useState<{
    isOpen: boolean;
    staffId: string;
    staffName: string;
    date: string;
    status: AttendanceStatus;
    notes: string;
  } | null>(null);

  // Mapped attendance for selected date
  const dateAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance
      .filter((r) => r.date === selectedAttendanceDate)
      .forEach((r) => map.set(r.staff_id, r));
    return map;
  }, [attendance, selectedAttendanceDate]);

  // Daily roster summary statistics
  const dailyAttendanceStats = useMemo(() => {
    const isToday =
      selectedAttendanceDate === new Date().toISOString().slice(0, 10) ||
      selectedAttendanceDate === new Date().toLocaleDateString("en-CA");
    let presentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let offCount = 0;

    staff.forEach((s) => {
      const record = dateAttendanceMap.get(s.id);
      const effectiveStatus: AttendanceStatus = record
        ? record.status
        : isToday
        ? s.status === "active"
          ? "present"
          : s.status === "half_day"
          ? "half_day"
          : s.status === "on_leave"
          ? "on_leave"
          : s.status === "weekly_off"
          ? "weekly_off"
          : "present"
        : "present";

      if (effectiveStatus === "present") presentCount++;
      else if (effectiveStatus === "half_day") halfDayCount++;
      else if (effectiveStatus === "on_leave") leaveCount++;
      else if (effectiveStatus === "weekly_off") offCount++;
    });

    return {
      presentCount,
      halfDayCount,
      leaveCount,
      offCount,
      total: staff.length,
    };
  }, [staff, dateAttendanceMap, selectedAttendanceDate]);

  // Monthly summary stats per stylist
  const monthlyStaffAttendanceStats = useMemo(() => {
    const statsMap = new Map<
      string,
      { present: number; halfDay: number; leave: number; off: number; totalPayableDays: number }
    >();

    staff.forEach((s) => {
      const staffRecords = attendance.filter(
        (r) => r.staff_id === s.id && r.date.startsWith(attendanceMonth)
      );

      let present = 0;
      let halfDay = 0;
      let leave = 0;
      let off = 0;

      staffRecords.forEach((r) => {
        if (r.status === "present") present++;
        else if (r.status === "half_day") halfDay++;
        else if (r.status === "on_leave") leave++;
        else if (r.status === "weekly_off") off++;
      });

      statsMap.set(s.id, {
        present,
        halfDay,
        leave,
        off,
        totalPayableDays: present + halfDay * 0.5,
      });
    });

    return statsMap;
  }, [staff, attendance, attendanceMonth]);

  const handleMarkStaffAttendance = (staffId: string, status: AttendanceStatus, notes?: string) => {
    const isToday =
      selectedAttendanceDate === new Date().toISOString().slice(0, 10) ||
      selectedAttendanceDate === new Date().toLocaleDateString("en-CA");
    markStaffAttendance(staffId, selectedAttendanceDate, status, notes);
    if (isToday) {
      const staffStatus: StaffStatus =
        status === "present"
          ? "active"
          : status === "half_day"
          ? "half_day"
          : status === "on_leave"
          ? "on_leave"
          : status === "weekly_off"
          ? "weekly_off"
          : "active";
      setStaffDailyStatus(staffId, staffStatus);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedAttendanceDate);
    d.setDate(d.getDate() - 1);
    setSelectedAttendanceDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedAttendanceDate);
    d.setDate(d.getDate() + 1);
    setSelectedAttendanceDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedAttendanceDate(new Date().toISOString().slice(0, 10));
  };

  // CUSTOMER CRM STATE
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerGenderFilters, setCustomerGenderFilters] = useState<string[]>([]);
  const [customerVipOnly, setCustomerVipOnly] = useState<boolean>(false);
  const [customerTimeframeFilter, setCustomerTimeframeFilter] = useState<CustomerTimeframeFilter>("all");
  const [customerSortBy, setCustomerSortBy] = useState<"spent" | "visits" | "name" | "recent">("recent");
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const unifiedCustomers = useMemo(() => {
    return unifyCustomerList(customers, invoices);
  }, [customers, invoices]);

  const handleToggleCustomerGender = (gender: string) => {
    setCustomerGenderFilters((prev) =>
      prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
    );
  };

  const hasActiveCustomerFilters =
    Boolean(customerSearchQuery) ||
    customerTimeframeFilter !== "all" ||
    customerGenderFilters.length > 0 ||
    customerVipOnly;

  const handleResetCustomerFilters = () => {
    setCustomerSearchQuery("");
    setCustomerTimeframeFilter("all");
    setCustomerGenderFilters([]);
    setCustomerVipOnly(false);
  };

  const customerStats = useMemo(() => {
    const totalClients = unifiedCustomers.length;
    const todayClients = unifiedCustomers.filter((c) => isCustomerInTimeframe(c, "today")).length;
    const weekClients = unifiedCustomers.filter((c) => isCustomerInTimeframe(c, "week")).length;
    const monthClients = unifiedCustomers.filter((c) => isCustomerInTimeframe(c, "month")).length;
    const vipClients = unifiedCustomers.filter((c) => (c.total_visits || 0) >= 5).length;
    const totalRevenue = unifiedCustomers.reduce((acc, c) => acc + (c.total_spent || 0), 0);
    const totalVisits = unifiedCustomers.reduce((acc, c) => acc + (c.total_visits || 0), 0);
    const avgVisits = totalClients > 0 ? (totalVisits / totalClients).toFixed(1) : "0";

    return {
      totalClients,
      todayClients,
      weekClients,
      monthClients,
      vipClients,
      totalRevenue,
      avgVisits,
    };
  }, [unifiedCustomers]);

  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  // STAFF MODAL STATES
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffFormData, setStaffFormData] = useState<{
    name?: string;
    role?: string;
    phone?: string;
    commission_rate?: number | string;
    commission_type?: IncentiveType;
    product_commission_rate?: number | string;
    product_commission_type?: IncentiveType;
    status?: StaffStatus;
    color?: string;
    notes?: string;
  }>({
    name: "",
    role: "Stylist",
    phone: "",
    commission_rate: 15,
    commission_type: "percent",
    product_commission_rate: 10,
    product_commission_type: "percent",
    status: "active",
    color: "#8b5cf6",
    notes: "",
  });

  // CATALOG MODAL STATES
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null);
  const [catalogFormData, setCatalogFormData] = useState<{
    name?: string;
    type?: ItemType;
    category_id?: string;
    price?: number | string;
    duration_mins?: number | string;
    cost_price?: number | string;
    sku?: string;
    is_active?: boolean;
  }>({
    name: "",
    type: "service",
    category_id: categories[0]?.id || "",
    price: "",
    duration_mins: 45,
    cost_price: "",
    sku: "",
    is_active: true,
  });

  // PACKAGE / COMBO BUILDER STATES
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CatalogItem | null>(null);
  const [packageFormData, setPackageFormData] = useState<{
    name: string;
    category_id: string;
    package_service_ids: string[];
    price: number | string;
    package_regular_price: number;
    duration_mins: number | string;
  }>({
    name: "",
    category_id: "",
    package_service_ids: [],
    price: "",
    package_regular_price: 0,
    duration_mins: 30,
  });
  const [packageServicePickerSearch, setPackageServicePickerSearch] = useState("");

  // CATEGORY MODAL STATES
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<Partial<Category>>({
    name: "",
    type: "service",
    icon: "Scissors",
  });

  // USER MODAL STATES
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<AppUser>>({
    name: "",
    email: "",
    role: "receptionist",
    pin: "1111",
    avatar_color: "#ec4899",
    phone: "",
    is_active: true,
  });

  // SETTINGS FORM STATE
  const [settingsFormData, setSettingsFormData] = useState<SalonSettings>({ ...settings });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // SEARCH FILTERS
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<"all" | "service" | "package" | "product">("all");

  // STAFF HANDLERS
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffFormData({
      name: "",
      role: "Stylist",
      phone: "",
      commission_rate: 15,
      commission_type: "percent",
      product_commission_rate: 10,
      product_commission_type: "percent",
      status: "active",
      color: "#8b5cf6",
      notes: "",
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (st: Staff) => {
    setEditingStaff(st);
    setStaffFormData({
      ...st,
      commission_type: st.commission_type || "percent",
      product_commission_rate: st.product_commission_rate !== undefined ? st.product_commission_rate : (st.commission_rate ?? 10),
      product_commission_type: st.product_commission_type || "percent",
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.name) return;

    if (editingStaff) {
      updateStaff({
        ...editingStaff,
        ...staffFormData,
        name: staffFormData.name || editingStaff.name,
        commission_rate: Number(staffFormData.commission_rate) || 0,
        commission_type: staffFormData.commission_type || "percent",
        product_commission_rate: staffFormData.product_commission_rate !== undefined ? Number(staffFormData.product_commission_rate) : (Number(staffFormData.commission_rate) || 0),
        product_commission_type: staffFormData.product_commission_type || "percent",
      } as Staff);
    } else {
      addStaff({
        id: generateUUID(),
        name: staffFormData.name,
        role: staffFormData.role || "Stylist",
        phone: staffFormData.phone || "",
        commission_rate: Number(staffFormData.commission_rate) || 15,
        commission_type: staffFormData.commission_type || "percent",
        product_commission_rate: staffFormData.product_commission_rate !== undefined ? Number(staffFormData.product_commission_rate) : 10,
        product_commission_type: staffFormData.product_commission_type || "percent",
        status: (staffFormData.status as StaffStatus) || "active",
        color: staffFormData.color || "#8b5cf6",
        notes: staffFormData.notes || "",
        created_at: new Date().toISOString(),
      });
    }
    setIsStaffModalOpen(false);
  };

  const handleDeleteStaff = (st: Staff) => {
    if (confirm(`Are you sure you want to remove staff member "${st.name}"?`)) {
      deleteStaff(st.id);
    }
  };

  // CATALOG HANDLERS
  const handleOpenAddCatalog = (type: ItemType = "service") => {
    if (type === "package") {
      handleOpenAddPackage();
      return;
    }
    setEditingCatalogItem(null);
    setCatalogFormData({
      name: "",
      type,
      category_id: categories.find((c) => c.type === type)?.id || categories[0]?.id || "",
      price: "",
      duration_mins: type === "service" ? 45 : undefined,
      cost_price: "",
      sku: type === "product" ? `SKU-${Date.now().toString().slice(-4)}` : "",
      is_active: true,
    });
    setIsCatalogModalOpen(true);
  };

  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    const pkgCategory = categories.find((c) => c.type === "package") || categories[0];
    setPackageFormData({
      name: "",
      category_id: pkgCategory?.id || "",
      package_service_ids: [],
      price: "",
      package_regular_price: 0,
      duration_mins: 30,
    });
    setPackageServicePickerSearch("");
    setIsPackageModalOpen(true);
  };

  const handleOpenEditPackage = (item: CatalogItem) => {
    setEditingPackage(item);
    setPackageFormData({
      name: item.name,
      category_id: item.category_id || categories.find((c) => c.type === "package")?.id || categories[0]?.id || "",
      package_service_ids: item.package_service_ids || [],
      price: item.price,
      package_regular_price: item.package_regular_price || item.price,
      duration_mins: item.duration_mins || 30,
    });
    setPackageServicePickerSearch("");
    setIsPackageModalOpen(true);
  };

  const handleTogglePackageService = (serviceId: string) => {
    setPackageFormData((prev) => {
      const exists = prev.package_service_ids.includes(serviceId);
      const nextIds = exists
        ? prev.package_service_ids.filter((id) => id !== serviceId)
        : [...prev.package_service_ids, serviceId];

      const selectedServices = catalog.filter((i) => nextIds.includes(i.id));
      const regularSum = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const durationSum = selectedServices.reduce((sum, s) => sum + (s.duration_mins || 30), 0);

      // Auto-suggest discounted price if not previously set
      const numPrevPrice = Number(prev.price) || 0;
      const autoPrice =
        numPrevPrice === 0 || numPrevPrice === prev.package_regular_price
          ? Math.round((regularSum * 0.85) / 10) * 10
          : numPrevPrice;

      return {
        ...prev,
        package_service_ids: nextIds,
        package_regular_price: regularSum,
        duration_mins: durationSum || 30,
        price: autoPrice > 0 ? autoPrice : regularSum,
      };
    });
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageFormData.name.trim()) {
      alert("Please enter a package name.");
      return;
    }
    if (packageFormData.package_service_ids.length === 0) {
      alert("Please select at least one service to include in this package.");
      return;
    }

    const itemPayload: CatalogItem = {
      id: editingPackage ? editingPackage.id : generateUUID(),
      name: packageFormData.name.trim(),
      type: "package",
      category_id:
        packageFormData.category_id ||
        categories.find((c) => c.type === "package")?.id ||
        categories[0]?.id,
      price: Number(packageFormData.price) || 0,
      package_regular_price:
        Number(packageFormData.package_regular_price) || Number(packageFormData.price) || 0,
      package_service_ids: packageFormData.package_service_ids,
      duration_mins: Number(packageFormData.duration_mins) || 30,
      is_active: true,
      created_at: editingPackage?.created_at || new Date().toISOString(),
    };

    saveCatalogItem(itemPayload);
    setCatalogTypeFilter("package");
    setCatalogSearch("");
    setIsPackageModalOpen(false);
  };

  const handleOpenEditCatalog = (item: CatalogItem) => {
    if (item.type === "package") {
      handleOpenEditPackage(item);
      return;
    }
    setEditingCatalogItem(item);
    setCatalogFormData({ ...item });
    setIsCatalogModalOpen(true);
  };

  const handleSaveCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogFormData.name) return;

    const itemPayload: CatalogItem = {
      id: editingCatalogItem ? editingCatalogItem.id : generateUUID(),
      name: catalogFormData.name,
      type: catalogFormData.type || "service",
      category_id: catalogFormData.category_id,
      price: Number(catalogFormData.price) || 0,
      duration_mins: catalogFormData.type === "service" ? Number(catalogFormData.duration_mins) || 30 : undefined,
      cost_price: Number(catalogFormData.cost_price) || 0,
      sku: catalogFormData.type === "product" ? catalogFormData.sku : undefined,
      is_active: true,
      created_at: editingCatalogItem?.created_at || new Date().toISOString(),
    };

    saveCatalogItem(itemPayload);
    setIsCatalogModalOpen(false);
  };

  const handleDeleteCatalogItem = (item: CatalogItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}" from catalog?`)) {
      deleteCatalogItem(item.id);
    }
  };

  // CATEGORY HANDLERS
  const handleOpenAddCategory = (type: ItemType = "service") => {
    setEditingCategory(null);
    setCategoryFormData({ name: "", type, icon: "Scissors" });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryFormData({ name: cat.name, type: cat.type, icon: cat.icon || "Scissors" });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name) return;

    if (editingCategory) {
      saveCategory({
        ...editingCategory,
        name: categoryFormData.name,
        type: categoryFormData.type || "service",
        icon: categoryFormData.icon || "Scissors",
      });
    } else {
      addCategory({
        id: generateUUID(),
        name: categoryFormData.name,
        type: categoryFormData.type || "service",
        icon: categoryFormData.icon || "Scissors",
        created_at: new Date().toISOString(),
      });
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryFormData({ name: "", type: "service", icon: "Scissors" });
  };

  // USER / RECEPTIONIST HANDLERS
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: "",
      email: "",
      role: "receptionist",
      pin: "1234",
      avatar_color: "#ec4899",
      phone: "",
      is_active: true,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (usr: AppUser) => {
    setEditingUser(usr);
    setUserFormData({ ...usr });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email || !userFormData.pin) return;

    const payload: AppUser = {
      id: editingUser ? editingUser.id : generateUUID(),
      name: userFormData.name,
      email: userFormData.email,
      role: userFormData.role || "receptionist",
      pin: userFormData.pin,
      avatar_color: userFormData.avatar_color || "#ec4899",
      phone: userFormData.phone || "",
      is_active: true,
      created_at: editingUser?.created_at || new Date().toISOString(),
    };

    saveUser(payload);
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (usr: AppUser) => {
    if (usr.role === "admin") {
      alert("Cannot delete the primary Admin account.");
      return;
    }
    if (confirm(`Are you sure you want to remove user "${usr.name}"?`)) {
      deleteUser(usr.id);
    }
  };

  // SETTINGS SAVE
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsFormData);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // Item Sales Stats Map from non-void invoices
  const itemSalesStats = useMemo(() => {
    const countMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();

    invoices.forEach((inv) => {
      if (inv.status === "void") return;
      inv.items.forEach((item) => {
        const qty = item.quantity || 1;
        const rev = item.total_price || (item.unit_price ? item.unit_price * qty : 0);

        if (item.item_id) {
          countMap.set(item.item_id, (countMap.get(item.item_id) || 0) + qty);
          revenueMap.set(item.item_id, (revenueMap.get(item.item_id) || 0) + rev);
        }
        if (item.item_name) {
          const norm = item.item_name.toLowerCase().trim();
          countMap.set(norm, (countMap.get(norm) || 0) + qty);
          revenueMap.set(norm, (revenueMap.get(norm) || 0) + rev);
        }
      });
    });

    return { countMap, revenueMap };
  }, [invoices]);

  // Filtered and Sorted Catalog (Most Sold Items on Top)
  const filteredCatalog = useMemo(() => {
    const items = catalog.filter((item) => {
      if (catalogTypeFilter !== "all" && item.type !== catalogTypeFilter) return false;
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q))
        );
      }
      return true;
    });

    return items.sort((a, b) => {
      const salesA =
        itemSalesStats.countMap.get(a.id) ||
        itemSalesStats.countMap.get(a.name.toLowerCase().trim()) ||
        0;
      const salesB =
        itemSalesStats.countMap.get(b.id) ||
        itemSalesStats.countMap.get(b.name.toLowerCase().trim()) ||
        0;

      if (salesB !== salesA) {
        return salesB - salesA;
      }

      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim();
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }

      return a.name.localeCompare(b.name);
    });
  }, [catalog, catalogTypeFilter, catalogSearch, itemSalesStats]);

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-16">
      {/* MANAGEMENT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Catalog & Management Portal
              <Badge
                variant={currentUser?.role === "admin" ? "purple" : "secondary"}
                className="text-[10px] py-0 px-2 font-bold"
              >
                {currentUser?.role === "admin" ? "👑 Admin Access" : "💼 Receptionist Access"}
              </Badge>
            </h2>
            <p className="text-xs text-zinc-400">
              Manage services & retail products, categories, stylists & commission splits, and salon configuration.
            </p>
          </div>
        </div>
      </div>

      {/* ADMIN SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800/80">
        {[
          { id: "analytics", label: "Executive Analytics", icon: BarChart3 },
          {
            id: "invoices",
            label: currentUser?.role === "admin" ? "Invoices Audit & Delete" : "Invoices Audit",
            icon: Receipt,
            count: invoices.length,
          },
          { id: "customers", label: "Clients & CRM", icon: UserCheck, count: unifiedCustomers.length },
          { id: "staff", label: "Staff & Commissions", icon: Users, count: staff.length },
          { id: "catalog", label: "Services & Products", icon: Package, count: catalog.length },
          { id: "categories", label: "Categories", icon: Layers, count: categories.length },
          { id: "rewards", label: "Lucky Wheel Rewards", icon: Sparkles },
          ...(currentUser?.role === "admin"
            ? [
                { id: "users", label: "Receptionists & PINs", icon: KeyRound, count: users.length },
                { id: "settings", label: "Salon Business Config", icon: Store },
              ]
            : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-purple-950 text-white font-black" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB: EXECUTIVE ALL-TIME ANALYTICS DASHBOARD
          ========================================================================= */}
      {activeAdminTab === "analytics" && (
        <AdminAnalyticsDashboard />
      )}

      {/* =========================================================================
          TAB: INVOICE AUDIT & MASTER MANAGEMENT (ADMIN ONLY)
          ========================================================================= */}
      {activeAdminTab === "invoices" && (
        <AdminInvoiceManagement />
      )}

      {/* =========================================================================
          TAB: CLIENTS & CRM MANAGEMENT
          ========================================================================= */}
      {activeAdminTab === "customers" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Customer Directory & CRM</span>
                <Badge variant="purple" className="text-[10px] font-mono">
                  {unifiedCustomers.length} Total Clients
                </Badge>
              </h3>
              <p className="text-xs text-zinc-400">
                View customer histories, edit details, birthdays, notes, or quickly start a new bill.
              </p>
            </div>

            <Button
              variant="glow"
              size="sm"
              onClick={() => {
                setEditingCustomer(null);
                setIsCustomerModalOpen(true);
              }}
              className="gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Register New Client</span>
            </Button>
          </div>

          {/* CRM KPI OVERVIEW CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card
              onClick={() => setCustomerTimeframeFilter("all")}
              className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-purple-500/50 ${
                customerTimeframeFilter === "all" ? "ring-1 ring-purple-500 border-purple-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Clients</span>
                <div className="h-7 w-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{customerStats.totalClients}</span>
                <span className="text-[11px] text-zinc-500 font-medium">all sources</span>
              </div>
            </Card>

            <Card
              onClick={() => setCustomerTimeframeFilter("today")}
              className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-emerald-500/50 ${
                customerTimeframeFilter === "today" ? "ring-1 ring-emerald-500 border-emerald-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Today's Clients</span>
                <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-300">{customerStats.todayClients}</span>
                <span className="text-[11px] text-zinc-500 font-medium">active today</span>
              </div>
            </Card>

            <Card
              onClick={() => setCustomerTimeframeFilter("week")}
              className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-cyan-500/50 ${
                customerTimeframeFilter === "week" ? "ring-1 ring-cyan-500 border-cyan-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">This Week</span>
                <div className="h-7 w-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-cyan-300">{customerStats.weekClients}</span>
                <span className="text-[11px] text-zinc-500 font-medium">last 7 days</span>
              </div>
            </Card>

            <Card
              onClick={() => setCustomerTimeframeFilter("month")}
              className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-amber-500/50 ${
                customerTimeframeFilter === "month" ? "ring-1 ring-amber-500 border-amber-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">This Month</span>
                <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">{customerStats.monthClients}</span>
                <span className="text-[11px] text-zinc-500 font-medium">this month</span>
              </div>
            </Card>
          </div>

          {/* SEARCH, TIMEFRAME, GENDER & SORT TOOLBAR */}
          <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name, mobile, email, notes..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {customerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCustomerSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* TIMEFRAME FILTER CHIPS */}
              <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 overflow-x-auto">
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "📅 Today" },
                  { id: "week", label: "🗓️ Week" },
                  { id: "month", label: "🗓️ Month" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setCustomerTimeframeFilter(tf.id as CustomerTimeframeFilter)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      customerTimeframeFilter === tf.id
                        ? "bg-purple-600 text-white shadow-sm font-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* MULTI-SELECT GENDER TABS */}
              <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCustomerGenderFilters([])}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerGenderFilters.length === 0
                      ? "bg-purple-600 text-white shadow-sm font-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All Genders
                </button>
                {[
                  { id: "female", label: "👩 Female" },
                  { id: "male", label: "👨 Male" },
                  { id: "other", label: "⚧ Other" },
                ].map((g) => {
                  const isSelected = customerGenderFilters.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleToggleCustomerGender(g.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-sm font-black"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {/* MULTI-FILTER VIP TOGGLE */}
              <button
                type="button"
                onClick={() => setCustomerVipOnly(!customerVipOnly)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 h-9 ${
                  customerVipOnly
                    ? "bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-sm"
                    : "bg-zinc-950 text-amber-400/80 border-zinc-800 hover:text-amber-300 hover:bg-zinc-900"
                }`}
                title="Toggle VIP clients only (5+ visits)"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>VIP (5+)</span>
              </button>

              {/* SORT DROPDOWN */}
              <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 h-9">
                <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={customerSortBy}
                  onChange={(e) => setCustomerSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-zinc-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="recent">Recently Active</option>
                  <option value="spent">Highest Spenders</option>
                  <option value="visits">Most Frequent Visits</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>

              {/* DYNAMIC RESULT COUNT BADGE ON THE SIDE */}
              {(() => {
                const count = unifiedCustomers.filter((c) => {
                  const q = customerSearchQuery.toLowerCase().trim();
                  if (q) {
                    const match =
                      c.name.toLowerCase().includes(q) ||
                      c.phone.includes(q) ||
                      (c.email && c.email.toLowerCase().includes(q)) ||
                      (c.notes && c.notes.toLowerCase().includes(q));
                    if (!match) return false;
                  }
                  if (!isCustomerInTimeframe(c, customerTimeframeFilter)) return false;
                  if (
                    customerGenderFilters.length > 0 &&
                    !customerGenderFilters.includes(c.gender || "unspecified")
                  )
                    return false;
                  if (customerVipOnly && (c.total_visits || 0) < 5) return false;
                  return true;
                }).length;

                return (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-xs font-bold text-purple-200 shrink-0 h-9">
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                      <span>Count:</span>
                      <span className="text-white font-black font-mono text-sm">{count}</span>
                      <span className="text-zinc-500 text-[10px] font-normal">/ {unifiedCustomers.length}</span>
                    </div>

                    {hasActiveCustomerFilters && (
                      <button
                        type="button"
                        onClick={handleResetCustomerFilters}
                        className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer h-9"
                        title="Reset all filters"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* CUSTOMERS LIST / TABLE */}
          {(() => {
            const filteredCustomers = unifiedCustomers
              .filter((c) => {
                const q = customerSearchQuery.toLowerCase().trim();
                if (q) {
                  const matchSearch =
                    c.name.toLowerCase().includes(q) ||
                    c.phone.includes(q) ||
                    (c.email && c.email.toLowerCase().includes(q)) ||
                    (c.notes && c.notes.toLowerCase().includes(q));
                  if (!matchSearch) return false;
                }

                if (
                  customerGenderFilters.length > 0 &&
                  !customerGenderFilters.includes(c.gender || "unspecified")
                )
                  return false;

                if (!isCustomerInTimeframe(c, customerTimeframeFilter)) return false;

                if (customerVipOnly && (c.total_visits || 0) < 5) return false;

                return true;
              })
              .sort((a, b) => {
                if (customerSortBy === "spent") return (b.total_spent || 0) - (a.total_spent || 0);
                if (customerSortBy === "visits") return (b.total_visits || 0) - (a.total_visits || 0);
                if (customerSortBy === "name") return a.name.localeCompare(b.name);
                if (customerSortBy === "recent") {
                  const dateA = a.last_visit ? new Date(a.last_visit).getTime() : 0;
                  const dateB = b.last_visit ? new Date(b.last_visit).getTime() : 0;
                  return dateB - dateA;
                }
                return 0;
              });

            if (filteredCustomers.length === 0) {
              return (
                <Card className="p-8 text-center bg-zinc-950/40 border-zinc-800">
                  <UserCheck className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-zinc-300">No Customers Found</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    {customerSearchQuery
                      ? `No clients matched "${customerSearchQuery}".`
                      : "No customers match the selected filter."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCustomer(null);
                      setIsCustomerModalOpen(true);
                    }}
                    className="mt-3 gap-1.5 text-xs text-purple-400 hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add First Client</span>
                  </Button>
                </Card>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredCustomers.map((cust) => {
                  const isVIP = cust.total_visits >= 5;
                  const genderEmoji =
                    cust.gender === "female" ? "👩" : cust.gender === "male" ? "👨" : cust.gender === "other" ? "⚧" : "👤";

                  return (
                    <Card
                      key={cust.id}
                      className="p-3.5 bg-zinc-950/80 border-zinc-800/90 hover:border-purple-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2.5">
                        {/* HEADER: AVATAR & NAME */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                              {cust.name ? cust.name.charAt(0).toUpperCase() : "G"}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                                  {cust.name}
                                </h4>
                                {isVIP && (
                                  <Badge variant="purple" className="text-[9px] py-0 px-1.5 font-bold">
                                    <Sparkles className="h-2 w-2 text-amber-400 mr-0.5" /> VIP
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                <span>{genderEmoji} {cust.gender ? cust.gender.toUpperCase() : "UNSPECIFIED"}</span>
                                {cust.phone && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-zinc-300">{cust.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* STATS ROW */}
                        <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Total Visits</span>
                            <span className="font-bold text-white">{cust.total_visits || 0} visits</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Total Spent</span>
                            <span className="font-bold text-emerald-400 font-mono">
                              {formatCurrency(cust.total_spent || 0, settings.currency_symbol)}
                            </span>
                          </div>
                        </div>

                        {/* EMAIL / BIRTHDAY / NOTES PREVIEWS */}
                        {(cust.email || cust.birthday || cust.notes || cust.last_visit) && (
                          <div className="space-y-1 text-[11px] text-zinc-400 pt-1 border-t border-zinc-900">
                            {cust.last_visit && (
                              <div className="flex items-center gap-1.5 text-zinc-400">
                                <Clock className="h-3 w-3 text-zinc-500 shrink-0" />
                                <span>Last Visit: {formatDate(cust.last_visit)}</span>
                              </div>
                            )}
                            {cust.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3 w-3 text-zinc-500 shrink-0" />
                                <span className="truncate">{cust.email}</span>
                              </div>
                            )}
                            {cust.birthday && (
                              <div className="flex items-center gap-1.5 text-pink-400">
                                <Gift className="h-3 w-3 shrink-0" />
                                <span>Birthday: {cust.birthday}</span>
                              </div>
                            )}
                            {cust.notes && (
                              <p className="text-[11px] text-zinc-400 bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-800/60 italic line-clamp-2">
                                "{cust.notes}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CARD ACTIONS */}
                      <div className="flex items-center justify-between gap-1.5 pt-3 mt-2 border-t border-zinc-800/80">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDraftCustomer(cust);
                              setActiveTab("pos");
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Start billing this customer"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            <span>Bill Now</span>
                          </button>

                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHistoryCustomer(cust);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="View past billing invoices & history"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(cust);
                              setIsCustomerModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Edit customer details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
                                deleteCustomer(cust.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete customer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          TAB 1: STAFF & STYLISTS MANAGEMENT
          ========================================================================= */}
      {activeAdminTab === "staff" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* HEADER WITH ATTENDANCE LOG TRIGGER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-zinc-800/80">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Stylists, Attendance & Commission</span>
                <Badge variant="purple" className="text-[10px] font-mono">
                  {staff.length} Stylists
                </Badge>
              </h3>
              <p className="text-xs text-zinc-400">
                Track daily attendance, manage half-days / leaves, and configure split commission tiers.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAttendanceLogModalOpen(true)}
                className="gap-1.5 text-xs font-semibold bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-purple-300 hover:text-white"
              >
                <CalendarDays className="h-4 w-4 text-purple-400" />
                <span>Monthly Attendance Register</span>
              </Button>

              <Button variant="glow" size="sm" onClick={handleOpenAddStaff} className="gap-1.5 text-xs font-bold">
                <Plus className="h-4 w-4" />
                <span>Add New Stylist</span>
              </Button>
            </div>
          </div>

          {/* DAILY ATTENDANCE ROSTER BAR */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* DATE PICKER & NAV */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 p-0.5">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={selectedAttendanceDate}
                  onChange={(e) => e.target.value && setSelectedAttendanceDate(e.target.value)}
                  className="h-8 px-2 text-xs font-bold text-white bg-transparent border-none focus:outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleToday}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  selectedAttendanceDate === new Date().toISOString().slice(0, 10)
                    ? "bg-purple-600/30 text-purple-300 border-purple-500/50"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
                }`}
              >
                Today
              </button>
            </div>

            {/* LIVE ATTENDANCE SUMMARY COUNTERS */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>{dailyAttendanceStats.presentCount} Present</span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 font-bold">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>{dailyAttendanceStats.halfDayCount} Half Day</span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 font-bold">
                <span className="h-2 w-2 rounded-full bg-rose-400"></span>
                <span>{dailyAttendanceStats.leaveCount} On Leave</span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
                <span>{dailyAttendanceStats.offCount} Off</span>
              </div>
            </div>
          </div>

          {/* STAFF CARDS GRID WITH 1-CLICK ATTENDANCE CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {staff.map((st) => {
              const isToday =
                selectedAttendanceDate === new Date().toISOString().slice(0, 10) ||
                selectedAttendanceDate === new Date().toLocaleDateString("en-CA");
              const record = dateAttendanceMap.get(st.id);
              const currentStatus: AttendanceStatus = record
                ? record.status
                : isToday
                ? st.status === "active"
                  ? "present"
                  : st.status === "half_day"
                  ? "half_day"
                  : st.status === "on_leave"
                  ? "on_leave"
                  : st.status === "weekly_off"
                  ? "weekly_off"
                  : "present"
                : "present";

              const monthly = monthlyStaffAttendanceStats.get(st.id) || {
                present: 0,
                halfDay: 0,
                leave: 0,
                off: 0,
                totalPayableDays: 0,
              };

              return (
                <div
                  key={st.id}
                  className={`rounded-2xl border bg-zinc-900/70 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between transition-all ${
                    currentStatus === "present"
                      ? "border-emerald-900/40 hover:border-emerald-500/40"
                      : currentStatus === "half_day"
                      ? "border-amber-900/50 hover:border-amber-500/50 bg-amber-950/10"
                      : currentStatus === "on_leave"
                      ? "border-rose-900/50 hover:border-rose-500/50 bg-rose-950/10 opacity-90"
                      : "border-zinc-800/90 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    {/* STYLIST HEADER & CURRENT STATUS BADGE */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl font-extrabold text-base text-white shadow-md"
                          style={{ backgroundColor: st.color || "#8b5cf6" }}
                        >
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight">{st.name}</h4>
                          <span className="text-[11px] text-purple-300 font-medium">{st.role}</span>
                        </div>
                      </div>

                      {/* CURRENT STATUS PILL */}
                      <div>
                        {currentStatus === "present" && (
                          <Badge variant="success" className="text-[10px] py-0.5 px-2 font-bold shadow-sm">
                            🟢 Present
                          </Badge>
                        )}
                        {currentStatus === "half_day" && (
                          <Badge variant="warning" className="text-[10px] py-0.5 px-2 font-bold shadow-sm bg-amber-950 text-amber-300 border-amber-600">
                            🟡 Half Day
                          </Badge>
                        )}
                        {currentStatus === "on_leave" && (
                          <Badge variant="destructive" className="text-[10px] py-0.5 px-2 font-bold shadow-sm bg-rose-950 text-rose-300 border-rose-600">
                            🔴 On Leave
                          </Badge>
                        )}
                        {currentStatus === "weekly_off" && (
                          <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-bold text-zinc-400 border-zinc-700">
                            ⚪ Weekly Off
                          </Badge>
                        )}
                        {currentStatus === "absent" && (
                          <Badge variant="destructive" className="text-[10px] py-0.5 px-2 font-bold bg-rose-950 text-rose-300">
                            ✕ Absent
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* ATTENDANCE 4-WAY SEGMENTED ACTION BUTTONS */}
                    <div className="mb-3">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1 flex items-center justify-between">
                        <span>Mark for {selectedAttendanceDate === new Date().toISOString().slice(0, 10) ? "Today" : selectedAttendanceDate}</span>
                        {record?.notes && (
                          <span className="text-amber-400 font-normal italic truncate max-w-[120px]" title={record.notes}>
                            Note: {record.notes}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950/90 rounded-xl border border-zinc-800">
                        {[
                          { id: "present", label: "Present", icon: "🟢", bg: "bg-emerald-600 text-white font-bold" },
                          { id: "half_day", label: "Half Day", icon: "🟡", bg: "bg-amber-600 text-white font-bold" },
                          { id: "on_leave", label: "Leave", icon: "🔴", bg: "bg-rose-600 text-white font-bold" },
                          { id: "weekly_off", label: "Off", icon: "⚪", bg: "bg-zinc-700 text-white font-bold" },
                        ].map((btn) => {
                          const isSelected = currentStatus === btn.id;
                          return (
                            <button
                              key={btn.id}
                              type="button"
                              onClick={() => handleMarkStaffAttendance(st.id, btn.id as AttendanceStatus)}
                              className={`py-1 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
                                isSelected
                                  ? `${btn.bg} shadow-sm font-black`
                                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                              }`}
                              title={`Mark ${st.name} as ${btn.label}`}
                            >
                              <span className="text-[10px]">{btn.icon}</span>
                              <span className="text-[10px]">{btn.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* MONTHLY ATTENDANCE STATS TALLY */}
                    <div className="flex items-center justify-between text-[11px] bg-purple-950/20 border border-purple-800/30 px-2.5 py-1.5 rounded-xl text-purple-200 mb-3 font-medium">
                      <span>This Month:</span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-emerald-400 font-bold" title="Present days">
                          {monthly.present}P
                        </span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold" title="Half days">
                          {monthly.halfDay}HD
                        </span>
                        <span>•</span>
                        <span className="text-rose-400 font-bold" title="Leaves taken">
                          {monthly.leave}L
                        </span>
                        <span>•</span>
                        <span className="text-white font-bold" title="Total payable days">
                          = {monthly.totalPayableDays} Days
                        </span>
                      </div>
                    </div>

                    {/* INCENTIVE & COMMISSION DETAILS */}
                    <div className="space-y-1.5 text-xs bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 mb-3">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Service Incentive:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {st.commission_type === "fixed"
                            ? `${formatCurrency(st.commission_rate, settings.currency_symbol)} Flat`
                            : `${st.commission_rate}% Rate`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Product Incentive:</span>
                        <span className="font-mono font-bold text-purple-400">
                          {st.product_commission_type === "fixed"
                            ? `${formatCurrency(st.product_commission_rate ?? st.commission_rate, settings.currency_symbol)} Flat`
                            : `${st.product_commission_rate ?? 10}% Rate`}
                        </span>
                      </div>
                      {st.phone && (
                        <div className="flex justify-between items-center text-zinc-400 pt-1 border-t border-zinc-900">
                          <span>Phone:</span>
                          <span className="font-mono text-zinc-300">{st.phone}</span>
                        </div>
                      )}
                      {st.notes && (
                        <p className="text-[10px] text-zinc-500 line-clamp-1 italic pt-1 border-t border-zinc-900">
                          "{st.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditStaff(st)}
                      className="flex-1 text-xs h-8 gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-purple-400" />
                      <span>Edit Profile</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(st)}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                      title="Delete staff member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CATALOG (SERVICES, PACKAGES & PRODUCTS) CRUD
          ========================================================================= */}
      {activeAdminTab === "catalog" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Services, Combos & Products Catalog</h3>
              <p className="text-xs text-zinc-400">
                Add, update pricing, create multi-service package combos, and manage active status.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="glow"
                size="sm"
                onClick={() => handleOpenAddCatalog("service")}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Service</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddPackage}
                className="gap-1.5 text-xs font-bold bg-gradient-to-r from-purple-950/60 to-pink-950/60 border-purple-700/60 hover:border-pink-500 text-pink-300 hover:text-white"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>+ Create Package</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAddCatalog("product")}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Product</span>
              </Button>
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-zinc-900/70 p-2.5 rounded-2xl border border-zinc-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search catalog by name or SKU..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0 overflow-x-auto">
              <button
                onClick={() => setCatalogTypeFilter("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  catalogTypeFilter === "all" ? "bg-purple-600 text-white font-bold" : "text-zinc-400"
                }`}
              >
                All ({catalog.length})
              </button>
              <button
                onClick={() => setCatalogTypeFilter("service")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  catalogTypeFilter === "service" ? "bg-purple-600 text-white font-bold" : "text-zinc-400"
                }`}
              >
                Services ({catalog.filter((i) => i.type === "service").length})
              </button>
              <button
                onClick={() => setCatalogTypeFilter("package")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  catalogTypeFilter === "package" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-sm" : "text-zinc-400"
                }`}
              >
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>Packages ({catalog.filter((i) => i.type === "package").length})</span>
              </button>
              <button
                onClick={() => setCatalogTypeFilter("product")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  catalogTypeFilter === "product" ? "bg-purple-600 text-white font-bold" : "text-zinc-400"
                }`}
              >
                Retail ({catalog.filter((i) => i.type === "product").length})
              </button>
            </div>
          </div>

          {/* CATALOG TABLE / GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCatalog.map((item) => {
              const isService = item.type === "service";
              const isPackage = item.type === "package";
              const isProduct = item.type === "product";
              const category = categories.find((c) => c.id === item.category_id);
              const itemSalesCount =
                itemSalesStats.countMap.get(item.id) ||
                itemSalesStats.countMap.get(item.name.toLowerCase().trim()) ||
                0;

              const savings =
                isPackage && item.package_regular_price && item.package_regular_price > item.price
                  ? item.package_regular_price - item.price
                  : 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3.5 backdrop-blur-xl shadow-lg flex flex-col justify-between transition-all ${
                    isPackage
                      ? "border-purple-900/50 bg-gradient-to-b from-purple-950/20 to-zinc-900/80 hover:border-pink-500/50"
                      : "border-zinc-800/90 bg-zinc-900/70 hover:border-purple-500/40"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                            isPackage
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                              : isService
                              ? "bg-purple-500/15 text-purple-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {isPackage ? "Package Combo" : isService ? "Service" : "Retail Product"}
                        </span>
                        {itemSalesCount > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            title={`${itemSalesCount} units billed`}
                          >
                            🔥 {itemSalesCount} sold
                          </span>
                        )}
                      </div>
                      {category && (
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {category.name}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white leading-tight mb-2">
                      {item.name}
                    </h4>

                    {isProduct ? (
                      <div className="space-y-2 mb-3">
                        <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/60">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Sale Price (4x)</span>
                            <span className="font-mono font-extrabold text-emerald-400">
                              {formatCurrency(item.price, settings.currency_symbol)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Purchase Cost</span>
                            <span className="font-mono font-semibold text-zinc-300">
                              {formatCurrency(item.cost_price || 0, settings.currency_symbol)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-1.5 rounded-lg text-emerald-300">
                          <span className="font-medium">Unit Profit:</span>
                          <span className="font-mono font-extrabold">
                            +{formatCurrency(Math.max(0, item.price - (item.cost_price || 0)), settings.currency_symbol)}
                            {item.price > 0 && (
                              <span className="text-[10px] ml-1 font-semibold opacity-80">
                                ({(((item.price - (item.cost_price || 0)) / item.price) * 100).toFixed(0)}% margin)
                              </span>
                            )}
                          </span>
                        </div>
                        {item.sku && (
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
                            <span>SKU / Code:</span>
                            <span className="font-mono font-bold text-zinc-300">{item.sku}</span>
                          </div>
                        )}
                      </div>
                    ) : isPackage ? (
                      <div className="space-y-2 mb-3">
                        {/* INCLUDED SERVICES PILLS */}
                        {item.package_service_ids && item.package_service_ids.length > 0 && (
                          <div className="bg-zinc-950/60 p-2 rounded-xl border border-purple-900/30 space-y-1">
                            <span className="text-[10px] text-pink-300 font-semibold flex items-center gap-1">
                              <Layers className="h-3 w-3 text-pink-400" />
                              Included Services ({item.package_service_ids.length}):
                            </span>
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.package_service_ids.map((id) => {
                                const svc = catalog.find(
                                  (c) =>
                                    c.id === id ||
                                    c.id.replace(/-/g, "").endsWith(id) ||
                                    c.id.replace(/-/g, "").startsWith(id)
                                );
                                return (
                                  <span
                                    key={id}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/50 border border-purple-800/40 text-purple-200 font-medium"
                                  >
                                    {svc ? svc.name : id}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/60">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Package Price</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono font-extrabold text-emerald-400">
                                {formatCurrency(item.price, settings.currency_symbol)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Duration</span>
                            <span className="font-mono text-zinc-300 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-zinc-400" />
                              {item.duration_mins || 30}m
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/60 mb-3">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Price</span>
                          <span className="font-mono font-extrabold text-emerald-400">
                            {formatCurrency(item.price, settings.currency_symbol)}
                          </span>
                        </div>
                        {item.duration_mins ? (
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Duration</span>
                            <span className="font-mono text-zinc-300 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-zinc-400" />
                              {item.duration_mins}m
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Type</span>
                            <span className="font-medium text-zinc-300">Service</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditCatalog(item)}
                      className="flex-1 text-xs h-7 gap-1"
                    >
                      <Edit2 className="h-3 w-3 text-purple-400" />
                      <span>{isPackage ? "Edit Package" : "Edit Price/Details"}</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCatalogItem(item)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CATEGORIES CRUD
          ========================================================================= */}
      {activeAdminTab === "categories" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Catalog Categories</h3>
              <p className="text-xs text-zinc-400">
                Organize services and retail products into intuitive groups.
              </p>
            </div>

            <Button
              variant="glow"
              size="sm"
              onClick={() => handleOpenAddCategory("service")}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{cat.name}</h4>
                    <span className="text-[10px] text-zinc-400 capitalize">{cat.type} Category</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditCategory(cat)}
                    className="p-1.5 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete category "${cat.name}"?`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: USER & RECEPTIONIST ACCOUNTS (PIN MANAGEMENT)
          ========================================================================= */}
      {activeAdminTab === "users" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Staff Users & PIN Credentials</h3>
              <p className="text-xs text-zinc-400">
                Manage 4-digit PINs, receptionist accounts, and admin privileges.
              </p>
            </div>

            <Button variant="glow" size="sm" onClick={handleOpenAddUser} className="gap-1.5 text-xs font-bold">
              <Plus className="h-4 w-4" />
              <span>+ Add Receptionist</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {users.map((usr) => {
              const isAdmin = usr.role === "admin";

              return (
                <div
                  key={usr.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="h-10 w-10 rounded-xl font-extrabold text-sm text-white flex items-center justify-center shadow-inner"
                        style={{ backgroundColor: usr.avatar_color }}
                      >
                        {usr.name.charAt(0)}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAdmin ? "bg-purple-500/20 text-purple-300" : "bg-pink-500/20 text-pink-300"
                        }`}
                      >
                        {isAdmin ? "👑 Admin" : "💼 Receptionist"}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-tight">{usr.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{usr.email}</p>

                    <div className="mt-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500">4-Digit PIN:</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-amber-400 text-sm tracking-wider">
                          {visiblePins[usr.id] ? usr.pin : "••••"}
                        </strong>
                        <button
                          type="button"
                          onClick={() =>
                            setVisiblePins((prev) => ({
                              ...prev,
                              [usr.id]: !prev[usr.id],
                            }))
                          }
                          className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                          title={visiblePins[usr.id] ? "Hide PIN" : "Show PIN"}
                        >
                          {visiblePins[usr.id] ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-zinc-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditUser(usr)}
                      className="flex-1 text-xs h-8 gap-1"
                    >
                      <Edit2 className="h-3 w-3 text-purple-400" />
                      <span>Edit PIN / Profile</span>
                    </Button>
                    {!isAdmin && (
                      <button
                        onClick={() => handleDeleteUser(usr)}
                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: LUCKY WHEEL OFFERS, INVENTORY & REWARDS MANAGEMENT
          ========================================================================= */}
      {activeAdminTab === "rewards" && (
        <div className="animate-in fade-in duration-200">
          <AdminRewardsManagement />
        </div>
      )}

      {/* =========================================================================
          TAB 5: SALON BUSINESS & TAX CONFIGURATION
          ========================================================================= */}
      {activeAdminTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Salon Identity & Billing Setup</h3>
              <p className="text-xs text-zinc-400">
                Configure GSTIN, UPI ID, invoice prefix, and thermal print width.
              </p>
            </div>

            <Button variant="glow" type="submit" className="gap-2">
              {settingsSaved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center gap-1.5">
                <Store className="h-4 w-4 text-purple-400" /> Salon Store Details
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Salon Name</label>
                  <input
                    type="text"
                    value={settingsFormData.salon_name}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, salon_name: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Tagline</label>
                  <input
                    type="text"
                    value={settingsFormData.tagline}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, tagline: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Store Address</label>
                  <input
                    type="text"
                    value={settingsFormData.address}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, address: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Phone</label>
                    <input
                      type="text"
                      value={settingsFormData.phone}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, phone: e.target.value })}
                      className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Email</label>
                    <input
                      type="email"
                      value={settingsFormData.email}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, email: e.target.value })}
                      className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-purple-400" /> Tax & Payment Gateway
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">GST / Tax Number</label>
                    <input
                      type="text"
                      value={settingsFormData.gst_number}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, gst_number: e.target.value })}
                      className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">GST Rate (%)</label>
                    <input
                      type="number"
                      value={settingsFormData.tax_rate}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, tax_rate: Number(e.target.value) || 0 })}
                      className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">UPI ID (For Dynamic QR Code)</label>
                  <input
                    type="text"
                    value={settingsFormData.upi_id}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, upi_id: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      value={settingsFormData.invoice_prefix}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, invoice_prefix: e.target.value })}
                      className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Thermal Receipt Format</label>
                    <select
                      value={settingsFormData.thermal_width}
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, thermal_width: e.target.value as any })}
                      className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="80mm">80mm (Standard POS)</option>
                      <option value="58mm">58mm (Compact POS)</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* =========================================================================
          MODALS: STAFF ADD/EDIT MODAL
          ========================================================================= */}
      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen} maxWidth="md">
        <form onSubmit={handleSaveStaff}>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Stylist Profile" : "Add New Stylist"}</DialogTitle>
            <DialogDescription>Configure staff commission, role, and details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={staffFormData.name || ""}
                onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Designation / Role</label>
                <input
                  type="text"
                  placeholder="e.g. Master Colorist"
                  value={staffFormData.role || ""}
                  onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Phone (Optional)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="e.g. 9876500000"
                  value={staffFormData.phone || ""}
                  onChange={(e) =>
                    setStaffFormData({
                      ...staffFormData,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* INCENTIVE & COMMISSION SCHEME */}
            <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Staff Incentive & Commission Scheme
              </h5>

              {/* 1. SERVICE INCENTIVE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">Service Incentive</label>
                  <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setStaffFormData({ ...staffFormData, commission_type: "percent" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        staffFormData.commission_type !== "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      % Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffFormData({ ...staffFormData, commission_type: "fixed" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        staffFormData.commission_type === "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      ₹ Flat Amount
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder={staffFormData.commission_type === "fixed" ? "e.g. 150 (₹ flat per service)" : "e.g. 15 (% rate)"}
                    value={staffFormData.commission_rate ?? ""}
                    onChange={(e) => setStaffFormData({ ...staffFormData, commission_rate: e.target.value })}
                    className="w-full h-9 px-3 pr-16 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">
                    {staffFormData.commission_type === "fixed" ? "₹ / service" : "% of sale"}
                  </span>
                </div>
              </div>

              {/* 2. PRODUCT SALE INCENTIVE */}
              <div className="space-y-1.5 pt-2.5 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">Product Retail Incentive</label>
                  <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setStaffFormData({ ...staffFormData, product_commission_type: "percent" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        staffFormData.product_commission_type !== "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      % Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffFormData({ ...staffFormData, product_commission_type: "fixed" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        staffFormData.product_commission_type === "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      ₹ Flat Amount
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder={staffFormData.product_commission_type === "fixed" ? "e.g. 100 (₹ flat per product)" : "e.g. 10 (% rate)"}
                    value={staffFormData.product_commission_rate ?? ""}
                    onChange={(e) => setStaffFormData({ ...staffFormData, product_commission_rate: e.target.value })}
                    className="w-full h-9 px-3 pr-16 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-purple-400 font-mono font-bold focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">
                    {staffFormData.product_commission_type === "fixed" ? "₹ / item" : "% of sale"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Default Floor Status</label>
                <select
                  value={staffFormData.status || "active"}
                  onChange={(e) => setStaffFormData({ ...staffFormData, status: e.target.value as StaffStatus })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-medium"
                >
                  <option value="active">🟢 Active (Present)</option>
                  <option value="half_day">🟡 Half Day</option>
                  <option value="on_leave">🔴 On Leave</option>
                  <option value="weekly_off">⚪ Weekly Off</option>
                  <option value="inactive">⚫ Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Avatar Color</label>
                <input
                  type="color"
                  value={staffFormData.color || "#8b5cf6"}
                  onChange={(e) => setStaffFormData({ ...staffFormData, color: e.target.value })}
                  className="w-full h-9 px-1 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" type="submit">
              {editingStaff ? "Update Stylist" : "Save Stylist"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* =========================================================================
          MODALS: CATALOG ADD/EDIT MODAL
          ========================================================================= */}
      <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen} maxWidth="md">
        <form onSubmit={handleSaveCatalog}>
          <DialogHeader>
            <DialogTitle>
              {editingCatalogItem ? "Edit Catalog Item" : `Add New ${catalogFormData.type === "service" ? "Service" : "Product"}`}
            </DialogTitle>
            <DialogDescription>Set prices, category, and duration.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Item Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Keratin Hair Treatment"
                value={catalogFormData.name || ""}
                onChange={(e) => setCatalogFormData({ ...catalogFormData, name: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Type</label>
                <select
                  value={catalogFormData.type}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, type: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white"
                >
                  <option value="service">Salon Service</option>
                  <option value="product">Retail Product</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Category</label>
                <select
                  value={catalogFormData.category_id || ""}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, category_id: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white"
                >
                  {categories
                    .filter((c) => (catalogFormData.type ? c.type === catalogFormData.type : true))
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {catalogFormData.type === "product" ? (
              <div className="space-y-3 p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1 block">Purchase Cost / MRP (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={catalogFormData.cost_price ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cost = val === "" ? "" : Number(val);
                        setCatalogFormData({
                          ...catalogFormData,
                          cost_price: val,
                          price: val === "" ? "" : (typeof cost === "number" && !isNaN(cost) ? cost * 4 : ""),
                        });
                      }}
                      placeholder="e.g. 790"
                      className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-emerald-400 block">Sale Price (4x) (₹) *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const cost = Number(catalogFormData.cost_price) || 0;
                          setCatalogFormData({ ...catalogFormData, price: cost > 0 ? cost * 4 : "" });
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold"
                      >
                        ⚡ Reset 4x
                      </button>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      value={catalogFormData.price ?? ""}
                      onChange={(e) => setCatalogFormData({ ...catalogFormData, price: e.target.value })}
                      placeholder="e.g. 3160"
                      className="w-full h-9 px-3 text-xs bg-zinc-900 border border-emerald-900/60 rounded-xl text-emerald-400 font-mono font-extrabold focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* LIVE PROFIT & MARGIN PREVIEW */}
                <div className="flex items-center justify-between text-xs bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-xl text-emerald-300">
                  <div>
                    <span className="text-[10px] text-emerald-500 block">Unit Profit</span>
                    <span className="font-mono font-bold">
                      +{formatCurrency(Math.max(0, (Number(catalogFormData.price) || 0) - (Number(catalogFormData.cost_price) || 0)), settings.currency_symbol)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-500 block">Profit Margin</span>
                    <span className="font-mono font-bold">
                      {(Number(catalogFormData.price) || 0) > 0
                        ? `${((((Number(catalogFormData.price) || 0) - (Number(catalogFormData.cost_price) || 0)) / (Number(catalogFormData.price) || 1)) * 100).toFixed(0)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">SKU / Barcode</label>
                  <input
                    type="text"
                    value={catalogFormData.sku || ""}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, sku: e.target.value })}
                    placeholder="e.g. PRD-LRL-01"
                    className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={catalogFormData.price ?? ""}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, price: e.target.value })}
                    placeholder="e.g. 1200"
                    className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400 font-mono font-bold focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={catalogFormData.duration_mins ?? ""}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, duration_mins: e.target.value })}
                    placeholder="e.g. 45"
                    className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsCatalogModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" type="submit">
              {editingCatalogItem ? "Update Item" : "Save Item"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* =========================================================================
          MODALS: PACKAGE & COMBO BUILDER MODAL
          ========================================================================= */}
      <Dialog
        open={isPackageModalOpen}
        onOpenChange={setIsPackageModalOpen}
        maxWidth="lg"
      >
        <form onSubmit={handleSavePackage}>
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Sparkles className="h-5 w-5 text-amber-200" />
              </div>
              <div>
                <DialogTitle>
                  {editingPackage ? "Edit Package / Combo" : "Create Service Package / Combo"}
                </DialogTitle>
                <DialogDescription>
                  Bundle multiple salon services into a discounted package deal (e.g. Haircut + Shaving).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3 max-h-[70vh] overflow-y-auto pr-1">
            {/* 1. PACKAGE NAME & QUICK PRESET SUGGESTIONS */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">
                Package / Combo Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Hair Cut + Shaving"
                value={packageFormData.name}
                onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-bold focus:ring-1 focus:ring-purple-500"
              />

              {/* QUICK CHIP SUGGESTIONS */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-zinc-500 font-semibold">Presets:</span>
                {[
                  "Hair Cut + Shaving",
                  "Hair Cut + Head Wash",
                  "Hair Cut + Head Wash + Shaving",
                  "Detan + Facial Glow Combo",
                  "Men's Deluxe Grooming Package",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPackageFormData({ ...packageFormData, name: preset })}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-purple-950/60 border border-zinc-800 hover:border-purple-700/60 text-zinc-300 hover:text-purple-200 transition-all font-medium"
                  >
                    ⚡ {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. CATEGORY SELECTOR */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Category</label>
              <select
                value={packageFormData.category_id}
                onChange={(e) => setPackageFormData({ ...packageFormData, category_id: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. MULTI-SERVICE PICKER */}
            <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-pink-400" />
                    Select Included Services ({packageFormData.package_service_ids.length} selected) *
                  </label>
                  <p className="text-[10px] text-zinc-500">
                    Click any service to toggle it into this package combo.
                  </p>
                </div>

                {packageFormData.package_service_ids.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPackageFormData({
                        ...packageFormData,
                        package_service_ids: [],
                        package_regular_price: 0,
                        price: 0,
                      })
                    }
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* SEARCH FILTER FOR SERVICES PICKER */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter available services..."
                  value={packageServicePickerSearch}
                  onChange={(e) => setPackageServicePickerSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* SERVICES LIST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {catalog
                  .filter((item) => item.type === "service")
                  .filter((item) => {
                    if (!packageServicePickerSearch.trim()) return true;
                    return item.name.toLowerCase().includes(packageServicePickerSearch.toLowerCase().trim());
                  })
                  .map((svc) => {
                    const isSelected = packageFormData.package_service_ids.includes(svc.id);
                    return (
                      <div
                        key={svc.id}
                        onClick={() => handleTogglePackageService(svc.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isSelected
                            ? "bg-purple-950/40 border-purple-500/80 text-white shadow-sm"
                            : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-4 w-4 rounded-md flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? "bg-purple-600 text-white"
                                : "border border-zinc-700 bg-zinc-950"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="truncate font-medium text-[11px]">{svc.name}</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-[11px] ml-2 shrink-0">
                          ₹{svc.price}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 4. LIVE PRICING & COMBO SUMMARY */}
            <div className="p-3.5 bg-gradient-to-r from-purple-950/30 to-pink-950/30 rounded-2xl border border-purple-900/40 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 block font-semibold">
                    Individual Regular Total
                  </span>
                  <span className="font-mono font-extrabold text-zinc-200 text-sm">
                    {formatCurrency(packageFormData.package_regular_price || 0, settings.currency_symbol)}
                  </span>
                </div>

                <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 block font-semibold">
                    Combined Duration
                  </span>
                  <span className="font-mono font-bold text-zinc-300 text-sm flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    {packageFormData.duration_mins || 30} mins
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-bold text-emerald-400 mb-1 block">
                    Special Package Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={packageFormData.price ?? ""}
                    onChange={(e) =>
                      setPackageFormData({
                        ...packageFormData,
                        price: e.target.value,
                      })
                    }
                    placeholder="e.g. 800"
                    className="w-full h-10 px-3 text-sm bg-zinc-950 border border-emerald-900/60 rounded-xl text-emerald-400 font-mono font-black focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* SAVINGS BADGE BANNER */}
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-1 font-semibold">Client Savings:</span>
                  {packageFormData.package_regular_price > (Number(packageFormData.price) || 0) && (Number(packageFormData.price) || 0) > 0 ? (
                    <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center justify-between">
                      <span>Save {formatCurrency(packageFormData.package_regular_price - (Number(packageFormData.price) || 0), settings.currency_symbol)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200">
                        {(((packageFormData.package_regular_price - (Number(packageFormData.price) || 0)) / (packageFormData.package_regular_price || 1)) * 100).toFixed(0)}% OFF
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-medium">
                      Set package price lower than ₹{packageFormData.package_regular_price || 0} for combo discount.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsPackageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="glow"
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold"
            >
              {editingPackage ? "Update Package Combo" : "Save Package Combo"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* =========================================================================
          MODALS: CATEGORY ADD & EDIT MODAL
          ========================================================================= */}
      <Dialog
        open={isCategoryModalOpen}
        onOpenChange={(open) => {
          setIsCategoryModalOpen(open);
          if (!open) setEditingCategory(null);
        }}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveCategory}>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? `Update details for category "${editingCategory.name}".`
                : "Add a new category for services or retail products."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Bridal Packages"
                value={categoryFormData.name || ""}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Type</label>
              <select
                value={categoryFormData.type}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value as any })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white"
              >
                <option value="service">Service Category</option>
                <option value="product">Product Category</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" type="submit">
              {editingCategory ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* =========================================================================
          MODALS: USER / PIN EDIT MODAL
          ========================================================================= */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen} maxWidth="md">
        <form onSubmit={handleSaveUser}>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User & PIN" : "Add Receptionist Account"}</DialogTitle>
            <DialogDescription>Configure staff login credentials and 4-digit PIN.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">User Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Amit Sharma"
                value={userFormData.name || ""}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="user@belezia.com"
                  value={userFormData.email || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">4-Digit PIN *</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="e.g. 1001"
                  value={userFormData.pin || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-amber-400 font-mono font-bold focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Role</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white"
                >
                  <option value="receptionist">Receptionist (Billing POS Only)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Avatar Color</label>
                <input
                  type="color"
                  value={userFormData.avatar_color || "#ec4899"}
                  onChange={(e) => setUserFormData({ ...userFormData, avatar_color: e.target.value })}
                  className="w-full h-9 px-1 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" type="submit">
              {editingUser ? "Update User" : "Save User"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* =========================================================================
          MODALS: MONTHLY ATTENDANCE REGISTER & MATRIX MODAL
          ========================================================================= */}
      <Dialog
        open={isAttendanceLogModalOpen}
        onOpenChange={setIsAttendanceLogModalOpen}
        maxWidth="4xl"
      >
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-purple-600/30 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Staff Monthly Attendance Register</DialogTitle>
                <DialogDescription>
                  Full month roster matrix. Click any day cell to change a stylist's attendance status.
                </DialogDescription>
              </div>
            </div>

            {/* MONTH PICKER */}
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={attendanceMonth}
                onChange={(e) => e.target.value && setAttendanceMonth(e.target.value)}
                className="h-9 px-3 text-xs font-bold text-white bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              />
            </div>
          </div>
        </DialogHeader>

        {/* MONTHLY SUMMARY METRICS */}
        {(() => {
          const [year, month] = attendanceMonth.split("-").map(Number);
          const daysInMonth = new Date(year, month, 0).getDate();
          const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          return (
            <div className="space-y-4 py-2">
              {/* ATTENDANCE MATRIX TABLE */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-inner">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-900/90 text-[10px] text-zinc-400 sticky top-0 z-10 border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-3 font-bold text-white min-w-[140px] sticky left-0 bg-zinc-900/95 z-20">
                          Stylist Name
                        </th>
                        {daysArray.map((day) => {
                          const dateStr = `${attendanceMonth}-${String(day).padStart(2, "0")}`;
                          const d = new Date(year, month - 1, day);
                          const dayOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
                          const isWeekend = d.getDay() === 0;
                          const isCurrentDay = dateStr === new Date().toISOString().slice(0, 10);

                          return (
                            <th
                              key={day}
                              className={`py-2 px-1 text-center font-mono min-w-[28px] border-l border-zinc-800/40 ${
                                isCurrentDay
                                  ? "bg-purple-950/60 text-purple-300 font-black"
                                  : isWeekend
                                  ? "bg-zinc-950/60 text-zinc-500"
                                  : ""
                              }`}
                            >
                              <div className="text-[10px] font-bold">{day}</div>
                              <div className="text-[8px] uppercase">{dayOfWeek}</div>
                            </th>
                          );
                        })}
                        <th className="py-2 px-2 text-center text-emerald-400 border-l border-zinc-800 font-bold min-w-[35px]">
                          P
                        </th>
                        <th className="py-2 px-2 text-center text-amber-400 border-l border-zinc-800 font-bold min-w-[35px]">
                          HD
                        </th>
                        <th className="py-2 px-2 text-center text-rose-400 border-l border-zinc-800 font-bold min-w-[35px]">
                          L
                        </th>
                        <th className="py-2 px-2 text-center text-white border-l border-zinc-800 font-black min-w-[50px] bg-zinc-900">
                          Payable
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-[11px]">
                      {staff.map((st) => {
                        const monthly = monthlyStaffAttendanceStats.get(st.id) || {
                          present: 0,
                          halfDay: 0,
                          leave: 0,
                          off: 0,
                          totalPayableDays: 0,
                        };

                        return (
                          <tr key={st.id} className="hover:bg-zinc-900/40 transition-colors">
                            {/* STYLIST NAME */}
                            <td className="py-2 px-3 font-semibold text-white sticky left-0 bg-zinc-950/95 z-10 border-r border-zinc-800/60 flex items-center gap-2">
                              <div
                                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: st.color || "#8b5cf6" }}
                              >
                                {st.name.charAt(0)}
                              </div>
                              <span className="truncate max-w-[100px]">{st.name}</span>
                            </td>

                            {/* DAY CELLS */}
                            {daysArray.map((day) => {
                              const dateStr = `${attendanceMonth}-${String(day).padStart(2, "0")}`;
                              const record = attendance.find(
                                (r) => r.staff_id === st.id && r.date === dateStr
                              );
                              const isToday = dateStr === new Date().toISOString().slice(0, 10);
                              const cellStatus: AttendanceStatus = record
                                ? record.status
                                : isToday
                                ? st.status === "active"
                                  ? "present"
                                  : st.status === "half_day"
                                  ? "half_day"
                                  : st.status === "on_leave"
                                  ? "on_leave"
                                  : st.status === "weekly_off"
                                  ? "weekly_off"
                                  : "present"
                                : "present";

                              const nextCycle: AttendanceStatus =
                                cellStatus === "present"
                                  ? "half_day"
                                  : cellStatus === "half_day"
                                  ? "on_leave"
                                  : cellStatus === "on_leave"
                                  ? "weekly_off"
                                  : "present";

                              return (
                                <td
                                  key={day}
                                  className="p-0.5 text-center border-l border-zinc-800/40"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleMarkStaffAttendance(st.id, nextCycle)}
                                    className={`h-6 w-6 mx-auto rounded-md text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                      cellStatus === "present"
                                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900"
                                        : cellStatus === "half_day"
                                        ? "bg-amber-950/80 text-amber-300 border border-amber-700/60 hover:bg-amber-900"
                                        : cellStatus === "on_leave"
                                        ? "bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900"
                                        : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-zinc-800"
                                    }`}
                                    title={`${st.name} on ${dateStr}: ${cellStatus} (Click to cycle)`}
                                  >
                                    {cellStatus === "present"
                                      ? "P"
                                      : cellStatus === "half_day"
                                      ? "HD"
                                      : cellStatus === "on_leave"
                                      ? "L"
                                      : "OFF"}
                                  </button>
                                </td>
                              );
                            })}

                            {/* TOTALS */}
                            <td className="py-2 px-1 text-center font-mono font-bold text-emerald-400 border-l border-zinc-800">
                              {monthly.present}
                            </td>
                            <td className="py-2 px-1 text-center font-mono font-bold text-amber-400 border-l border-zinc-800">
                              {monthly.halfDay}
                            </td>
                            <td className="py-2 px-1 text-center font-mono font-bold text-rose-400 border-l border-zinc-800">
                              {monthly.leave}
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-black text-white bg-zinc-900/60 border-l border-zinc-800">
                              {monthly.totalPayableDays}d
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LEGEND */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-zinc-300">Legend:</span>
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">P</span> = Full Present (1.0)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">HD</span> = Half Day (0.5)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">L</span> = Leave (0.0)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] font-bold">OFF</span> = Weekly Off
                  </span>
                </div>

                <div className="text-[10px] text-purple-300 italic">
                  Tip: Click any matrix cell to cycle attendance for that date.
                </div>
              </div>
            </div>
          );
        })()}

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setIsAttendanceLogModalOpen(false)}>
            Close Register
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CUSTOMER CREATE / EDIT MODAL */}
      <CustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        customerToEdit={editingCustomer}
        onSaved={() => {
          setEditingCustomer(null);
        }}
      />

      {/* CUSTOMER INVOICE HISTORY DIALOG (ADMIN) */}
      {selectedHistoryCustomer && (
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen} maxWidth="2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base flex items-center gap-2">
                  <span>{selectedHistoryCustomer.name}</span>
                  <Badge variant="purple" className="text-[10px] font-mono">
                    {(() => {
                      const custPhone = (selectedHistoryCustomer.phone || "").replace(/\D/g, "").slice(-10);
                      const custInvs = invoices.filter((inv) => {
                        const p = (inv.customer_phone || "").replace(/\D/g, "").slice(-10);
                        if (custPhone.length >= 7 && p.length >= 7 && custPhone === p) return true;
                        if (selectedHistoryCustomer.id && inv.customer_id === selectedHistoryCustomer.id) return true;
                        return false;
                      });
                      return `${custInvs.length} Invoices`;
                    })()}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {selectedHistoryCustomer.phone || "No phone"} • Total Lifetime Spend:{" "}
                  <span className="text-emerald-400 font-bold font-mono">
                    {formatCurrency(selectedHistoryCustomer.total_spent || 0, settings.currency_symbol)}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 py-2">
            {(() => {
              const custPhone = (selectedHistoryCustomer.phone || "").replace(/\D/g, "").slice(-10);
              const custInvoices = invoices
                .filter((inv) => {
                  const p = (inv.customer_phone || "").replace(/\D/g, "").slice(-10);
                  if (custPhone.length >= 7 && p.length >= 7 && custPhone === p) return true;
                  if (selectedHistoryCustomer.id && inv.customer_id === selectedHistoryCustomer.id) return true;
                  return false;
                })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

              if (custInvoices.length === 0) {
                return (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No past invoices recorded for this customer yet.
                  </div>
                );
              }

              return custInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-300">
                        #{inv.invoice_number}
                      </span>
                      <span className="text-[11px] text-zinc-500">•</span>
                      <span className="text-xs text-zinc-400">{formatDate(inv.created_at)}</span>
                      <Badge
                        variant={inv.status === "paid" ? "success" : inv.status === "void" ? "destructive" : "warning"}
                        className="text-[9px] uppercase font-bold"
                      >
                        {inv.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {formatCurrency(inv.grand_total, settings.currency_symbol)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHistoryModalOpen(false);
                          setPrintInvoice(inv);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 cursor-pointer"
                        title="View / Print Receipt"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* LINE ITEMS */}
                  <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60 space-y-1.5">
                    <div className="font-semibold text-zinc-300">Items / Services ({inv.items?.length || 0}):</div>
                    <div className="space-y-1.5">
                      {inv.items?.map((it, idx) => {
                        const primaryStaffName = staff.find((s) => s.id === it.primary_staff_id)?.name;
                        return (
                          <div
                            key={idx}
                            className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-300 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-200">
                                {it.item_name} (x{it.quantity})
                              </span>
                              {primaryStaffName && (
                                <span className="text-[10px] text-purple-400">
                                  (Stylist: {primaryStaffName})
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatCurrency(it.total_price, settings.currency_symbol)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsHistoryModalOpen(false);
                setSelectedHistoryCustomer(null);
              }}
            >
              Close History
            </Button>
          </DialogFooter>
        </Dialog>
      )}

    </div>
  );
}
