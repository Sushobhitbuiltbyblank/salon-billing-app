"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Customer, Invoice, CustomerReminderInfo, ReminderFilterType } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerModal } from "@/components/customer/CustomerModal";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, generateUUID } from "@/lib/utils";
import {
  unifyCustomerList,
  normalizePhoneNumber,
  normalizeCustomerName,
  isAnonymousCustomerName,
  isCustomerInTimeframe,
  CustomerTimeframeFilter,
} from "@/lib/customerUtils";
import {
  detectCustomerReminders,
  generateWhatsAppReminderUrl,
  wasReminderSentToday,
} from "@/lib/reminderUtils";
import {
  UserCheck,
  User,
  Plus,
  Search,
  Sparkles,
  Phone,
  Mail,
  Gift,
  Heart,
  Edit2,
  Trash2,
  ShoppingCart,
  X,
  TrendingUp,
  Award,
  Calendar,
  DollarSign,
  Users,
  Filter,
  ArrowUpDown,
  Receipt,
  FileText,
  Clock,
  Printer,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  BellRing,
  AlertTriangle,
  Send,
  Check,
  CalendarClock,
  Scissors,
  CheckCheck,
} from "lucide-react";

export function CustomerDirectory() {
  const {
    customers,
    saveCustomer,
    deleteCustomer,
    invoices,
    setPrintInvoice,
    setDraftCustomer,
    setActiveTab,
    settings,
    catalog,
    staff,
  } = useApp();

  const [activeCrmTab, setActiveCrmTab] = useState<"all" | "reminders" | "vip">("all");
  const [timeframeFilter, setTimeframeFilter] = useState<CustomerTimeframeFilter>("all");
  const [reminderSubFilter, setReminderSubFilter] = useState<ReminderFilterType>("all_due");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"spent" | "visits" | "name" | "recent">("recent");

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // INVOICE HISTORY MODAL STATE
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // UNIFIED CUSTOMER LIST COMBINING REGISTERED PROFILES & INVOICE DATA
  const unifiedCustomers = useMemo(() => {
    return unifyCustomerList(customers, invoices);
  }, [customers, invoices]);

  // DETECT REMINDER INFORMATION FOR ALL UNIFIED CUSTOMERS
  const reminderData = useMemo(() => {
    const list = detectCustomerReminders(unifiedCustomers, invoices);
    const map = new Map<string, CustomerReminderInfo>();
    list.forEach((r) => map.set(r.customer.id, r));

    const overdueList = list.filter((r) => r.isOverdue);
    const shaveDueList = overdueList.filter((r) => r.serviceType === "grooming_shave");
    const haircutDueList = overdueList.filter((r) => r.serviceType === "haircut_spa");
    const sentTodayList = list.filter((r) => r.reminderSentToday);
    const pendingDueList = overdueList.filter((r) => !r.reminderSentToday);

    return {
      allReminders: list,
      reminderMap: map,
      overdueList,
      totalDueCount: overdueList.length,
      shaveDueCount: shaveDueList.length,
      haircutDueCount: haircutDueList.length,
      sentTodayCount: sentTodayList.length,
      pendingDueCount: pendingDueList.length,
    };
  }, [unifiedCustomers, invoices]);

  // COMPUTED STATS ACROSS UNIFIED CUSTOMERS
  const stats = useMemo(() => {
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

  // FILTERED & SORTED CUSTOMERS / REMINDERS
  const displayItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (activeCrmTab === "reminders") {
      return reminderData.allReminders.filter((rem) => {
        const c = rem.customer;
        const matchSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          rem.serviceName.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q));

        const matchGender = genderFilter === "all" || c.gender === genderFilter;

        // Sub-filter inside Reminders tab
        let matchSubFilter = true;
        if (reminderSubFilter === "all_due") {
          matchSubFilter = rem.isOverdue;
        } else if (reminderSubFilter === "shave_due") {
          matchSubFilter = rem.isOverdue && rem.serviceType === "grooming_shave";
        } else if (reminderSubFilter === "haircut_due") {
          matchSubFilter = rem.isOverdue && rem.serviceType === "haircut_spa";
        } else if (reminderSubFilter === "sent_today") {
          matchSubFilter = rem.reminderSentToday;
        } else if (reminderSubFilter === "pending") {
          matchSubFilter = rem.isOverdue && !rem.reminderSentToday;
        }

        return matchSearch && matchGender && matchSubFilter;
      });
    }

    // ALL CLIENTS OR VIP TAB
    return unifiedCustomers
      .filter((c) => {
        const matchSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q));

        const matchGender = genderFilter === "all" || c.gender === genderFilter;
        const matchVip = activeCrmTab !== "vip" || (c.total_visits || 0) >= 5;
        const matchTimeframe = isCustomerInTimeframe(c, timeframeFilter);

        return matchSearch && matchGender && matchVip && matchTimeframe;
      })
      .sort((a, b) => {
        if (sortBy === "spent") return (b.total_spent || 0) - (a.total_spent || 0);
        if (sortBy === "visits") return (b.total_visits || 0) - (a.total_visits || 0);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "recent") {
          const dateA = a.last_visit ? new Date(a.last_visit).getTime() : 0;
          const dateB = b.last_visit ? new Date(b.last_visit).getTime() : 0;
          return dateB - dateA;
        }
        return 0;
      })
      .map((cust) => {
        return reminderData.reminderMap.get(cust.id) || {
          customer: cust,
          lastVisitDate: cust.last_visit || cust.created_at || new Date().toISOString(),
          daysElapsed: cust.last_visit
            ? Math.floor((Date.now() - new Date(cust.last_visit).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          serviceName: "Salon Service",
          serviceType: "haircut_spa" as const,
          intervalDays: 30,
          isOverdue: false,
          overdueDays: 0,
          lastReminderSentAt: cust.last_reminder_sent_at,
          reminderSentToday: wasReminderSentToday(cust.last_reminder_sent_at),
        };
      });
  }, [
    activeCrmTab,
    timeframeFilter,
    reminderSubFilter,
    reminderData,
    unifiedCustomers,
    searchQuery,
    genderFilter,
    sortBy,
  ]);

  // SYNC ALL INVOICE CUSTOMERS INTO PERMANENT DATABASE
  const handleSyncAllCustomersToDB = () => {
    setIsSyncing(true);
    let count = 0;
    unifiedCustomers.forEach((cust) => {
      saveCustomer(cust);
      count++;
    });
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage(`✓ Successfully synced ${count} customer profiles to database!`);
      setTimeout(() => setSyncMessage(null), 3000);
    }, 500);
  };

  const handleStartBill = (customer: Customer) => {
    setDraftCustomer(customer);
    setActiveTab("pos");
  };

  // SEND WHATSAPP REMINDER ACTION TRIGGER
  const handleSendWhatsAppReminder = (cust: Customer, info: CustomerReminderInfo) => {
    const url = generateWhatsAppReminderUrl(cust, info, settings.salon_name || "Belezia Salon");
    window.open(url, "_blank");

    const updatedCust: Customer = {
      ...cust,
      last_reminder_sent_at: new Date().toISOString(),
    };
    saveCustomer(updatedCust);

    setSyncMessage(`✓ WhatsApp reminder launched for ${cust.name}! Marked as sent today.`);
    setTimeout(() => setSyncMessage(null), 4000);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      deleteCustomer(customer.id);
    }
  };

  const handleOpenHistory = (customer: Customer) => {
    setSelectedHistoryCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  // GET INVOICES FOR SELECTED CUSTOMER
  const customerInvoices = useMemo(() => {
    if (!selectedHistoryCustomer) return [];
    const cleanPhone = normalizePhoneNumber(selectedHistoryCustomer.phone);

    return invoices.filter((inv) => {
      if (inv.status === "void" || (inv.status as string) === "cancelled") return false;
      const invPhone = normalizePhoneNumber(inv.customer_phone);

      if (cleanPhone.length >= 7 && invPhone.length >= 7) return cleanPhone === invPhone;
      if (selectedHistoryCustomer.id && inv.customer_id) return selectedHistoryCustomer.id === inv.customer_id;
      return false;
    });
  }, [selectedHistoryCustomer, invoices]);

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-300">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 p-0.5 shadow-lg shadow-purple-600/30 shrink-0">
            <div className="h-full w-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-purple-400">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Customer Directory & CRM</span>
              <Badge variant="purple" className="text-[11px] font-mono py-0 px-2 font-bold">
                {unifiedCustomers.length} Clients
              </Badge>
            </h2>
            <p className="text-xs text-zinc-400">
              Unified client database with intelligent follow-up reminders & 1-click WhatsApp triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSyncAllCustomersToDB}
            disabled={isSyncing}
            className="gap-1.5 text-xs text-purple-300 hover:text-white border-purple-800/80 hover:bg-purple-950/60 h-10 px-3 cursor-pointer"
            title="Sync all invoice customers into permanent database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-purple-400" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync to DB"}</span>
          </Button>

          <Button
            variant="glow"
            onClick={() => {
              setEditingCustomer(null);
              setIsCustomerModalOpen(true);
            }}
            className="gap-2 text-xs font-bold shrink-0 cursor-pointer shadow-lg shadow-purple-600/30 h-10 px-4"
          >
            <Plus className="h-4 w-4" />
            <span>Register New Customer</span>
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* CRM TOP LEVEL NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveCrmTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCrmTab === "all"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-zinc-800/80"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>All Clients ({unifiedCustomers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCrmTab("reminders")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCrmTab === "reminders"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black"
              : "bg-zinc-900/80 text-emerald-300 hover:text-white hover:bg-zinc-850 border border-emerald-900/50"
          }`}
        >
          <BellRing className="h-3.5 w-3.5 text-emerald-400" />
          <span>Follow-up Reminders</span>
          {reminderData.totalDueCount > 0 && (
            <Badge className="bg-amber-500 text-black font-black text-[10px] px-1.5 py-0 rounded-md animate-pulse">
              {reminderData.totalDueCount} Due
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveCrmTab("vip")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCrmTab === "vip"
              ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 font-black"
              : "bg-zinc-900/80 text-amber-300 hover:text-white hover:bg-zinc-850 border border-zinc-800/80"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>VIP Clients ({stats.vipClients})</span>
        </button>
      </div>

      {/* KPI SUMMARY CARDS */}
      {activeCrmTab === "reminders" ? (
        /* REMINDERS KPI CARDS */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3.5 bg-zinc-950/80 border-amber-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Total Due</span>
              <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <BellRing className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-300">{reminderData.totalDueCount}</span>
              <span className="text-[11px] text-zinc-500 font-medium">customers</span>
            </div>
          </Card>

          <Card className="p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">🪒 Shave / Beard (7d+)</span>
              <div className="h-7 w-7 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono text-xs">
                7d
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-orange-300">{reminderData.shaveDueCount}</span>
              <span className="text-[11px] text-zinc-500 font-medium">due</span>
            </div>
          </Card>

          <Card className="p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">✂️ Haircut & Spa (30d+)</span>
              <div className="h-7 w-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-xs">
                30d
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-purple-300">{reminderData.haircutDueCount}</span>
              <span className="text-[11px] text-zinc-500 font-medium">due</span>
            </div>
          </Card>

          <Card className="p-3.5 bg-zinc-950/80 border-emerald-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Sent Today</span>
              <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-300">{reminderData.sentTodayCount}</span>
              <span className="text-[11px] text-zinc-500 font-medium">dispatched</span>
            </div>
          </Card>
        </div>
      ) : (
        /* STANDARD CRM KPI CARDS */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card
            onClick={() => setTimeframeFilter("all")}
            className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-purple-500/50 ${
              timeframeFilter === "all" ? "ring-1 ring-purple-500 border-purple-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Clients</span>
              <div className="h-7 w-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.totalClients}</span>
              <span className="text-[11px] text-zinc-500 font-medium">all sources</span>
            </div>
          </Card>

          <Card
            onClick={() => setTimeframeFilter("today")}
            className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-emerald-500/50 ${
              timeframeFilter === "today" ? "ring-1 ring-emerald-500 border-emerald-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Today's Clients</span>
              <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-300">{stats.todayClients}</span>
              <span className="text-[11px] text-zinc-500 font-medium">active today</span>
            </div>
          </Card>

          <Card
            onClick={() => setTimeframeFilter("week")}
            className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-cyan-500/50 ${
              timeframeFilter === "week" ? "ring-1 ring-cyan-500 border-cyan-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">This Week</span>
              <div className="h-7 w-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-cyan-300">{stats.weekClients}</span>
              <span className="text-[11px] text-zinc-500 font-medium">last 7 days</span>
            </div>
          </Card>

          <Card
            onClick={() => setTimeframeFilter("month")}
            className={`p-3.5 bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden cursor-pointer transition-all hover:border-amber-500/50 ${
              timeframeFilter === "month" ? "ring-1 ring-amber-500 border-amber-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">This Month</span>
              <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-300">{stats.monthClients}</span>
              <span className="text-[11px] text-zinc-500 font-medium">this month</span>
            </div>
          </Card>
        </div>
      )}

      {/* SEARCH, TIMEFRAME, GENDER FILTER & SORT TOOLBAR */}
      <div className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-lg">
        {/* SEARCH INPUT */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by customer name, mobile, service, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm bg-zinc-950/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* FILTERS AND SORT */}
        <div className="flex flex-wrap items-center gap-2">
          {/* TIMEFRAME FILTER CHIPS (IN ALL/VIP TABS) */}
          {activeCrmTab !== "reminders" && (
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
                  onClick={() => setTimeframeFilter(tf.id as CustomerTimeframeFilter)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    timeframeFilter === tf.id
                      ? "bg-purple-600 text-white shadow-sm font-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          {/* REMINDER SUB-FILTER CHIPS (ONLY IN REMINDERS TAB) */}
          {activeCrmTab === "reminders" && (
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 overflow-x-auto">
              {[
                { id: "all_due", label: `All Due (${reminderData.totalDueCount})` },
                { id: "shave_due", label: `🪒 Shave 7d+ (${reminderData.shaveDueCount})` },
                { id: "haircut_due", label: `✂️ Haircut 30d+ (${reminderData.haircutDueCount})` },
                { id: "sent_today", label: `✓ Sent Today (${reminderData.sentTodayCount})` },
                { id: "pending", label: `⏳ Pending (${reminderData.pendingDueCount})` },
              ].map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => setReminderSubFilter(rf.id as ReminderFilterType)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    reminderSubFilter === rf.id
                      ? "bg-emerald-600 text-white shadow-sm font-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          )}

          {/* GENDER TABS */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800">
            {[
              { id: "all", label: "All" },
              { id: "female", label: "👩 Female" },
              { id: "male", label: "👨 Male" },
              { id: "other", label: "⚧ Other" },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setGenderFilter(g.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  genderFilter === g.id
                    ? "bg-purple-600 text-white shadow-sm font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* SORT DROPDOWN (ONLY IN ALL/VIP TAB) */}
          {activeCrmTab !== "reminders" && (
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 h-9">
              <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-zinc-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="recent">Recently Active</option>
                <option value="spent">Highest Spenders</option>
                <option value="visits">Most Frequent Visits</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          )}

          {/* DYNAMIC RESULT COUNT BADGE ON THE SIDE */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-xs font-bold text-purple-200 shrink-0">
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span>Count:</span>
            <span className="text-white font-black font-mono text-sm">{displayItems.length}</span>
            <span className="text-zinc-500 text-[10px] font-normal">/ {unifiedCustomers.length}</span>
          </div>
        </div>
      </div>

      {/* CUSTOMER DIRECTORY LIST / GRID */}
      {displayItems.length === 0 ? (
        <Card className="p-12 text-center bg-zinc-950/40 border-zinc-800">
          <UserCheck className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-200">
            {activeCrmTab === "reminders" ? "No Overdue Follow-up Reminders" : "No Customers Found"}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            {activeCrmTab === "reminders"
              ? "All returning customers are up to date with their service intervals! 🎉"
              : searchQuery
              ? `No clients matching "${searchQuery}".`
              : "No customers match the current filter selection."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingCustomer(null);
              setIsCustomerModalOpen(true);
            }}
            className="mt-4 gap-1.5 text-xs text-purple-300 hover:text-white border-purple-800 hover:bg-purple-950"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register New Client</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {displayItems.map((remInfo) => {
            const cust = remInfo.customer;
            const isVIP = (cust.total_visits || 0) >= 5;
            const genderLabel =
              cust.gender === "female"
                ? "👩 Female"
                : cust.gender === "male"
                ? "👨 Male"
                : cust.gender === "other"
                ? "⚧ Other"
                : "👤 Unspecified";

            return (
              <Card
                key={cust.id}
                className={`p-4 bg-zinc-950/80 transition-all flex flex-col justify-between group shadow-lg shadow-black/20 ${
                  remInfo.isOverdue
                    ? "border-amber-500/40 hover:border-amber-400/80"
                    : "border-zinc-800/90 hover:border-purple-500/40"
                }`}
              >
                <div className="space-y-3">
                  {/* HEADER: AVATAR, NAME, GENDER, AND PHONE */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-2xl border text-base font-black flex items-center justify-center shrink-0 shadow-md ${
                          remInfo.isOverdue
                            ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                            : "bg-gradient-to-tr from-purple-600/30 to-pink-600/20 border-purple-500/30 text-purple-300"
                        }`}
                      >
                        {cust.name ? cust.name.charAt(0).toUpperCase() : "G"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                            {cust.name}
                          </h3>
                          {isVIP && (
                            <Badge variant="purple" className="text-[9px] py-0 px-1.5 font-bold">
                              <Sparkles className="h-2.5 w-2.5 text-amber-400 mr-0.5" /> VIP
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                          <span className="text-[11px]">{genderLabel}</span>
                          {cust.phone && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-zinc-300 font-semibold">{cust.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* REMINDER & LAST SERVICE STATUS BANNER */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                      remInfo.isOverdue
                        ? remInfo.serviceType === "grooming_shave"
                          ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                          : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                        : "bg-zinc-900/90 border-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold flex items-center gap-1 text-[11px] truncate">
                        <span>{remInfo.serviceType === "grooming_shave" ? "🪒" : "✂️"}</span>
                        <span className="truncate">{remInfo.serviceName}</span>
                      </span>

                      {remInfo.isOverdue ? (
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0 shrink-0 ${
                            remInfo.serviceType === "grooming_shave"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/50"
                          }`}
                        >
                          {remInfo.overdueDays === 0
                            ? `Due today (${remInfo.intervalDays}d cycle)`
                            : `${remInfo.overdueDays}d overdue (${remInfo.intervalDays}d cycle)`}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-zinc-400">
                          {remInfo.daysElapsed} days ago
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Last Visit: {formatDate(remInfo.lastVisitDate)} ({remInfo.daysElapsed}d ago)</span>
                      {remInfo.reminderSentToday ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <CheckCheck className="h-3 w-3" />
                          <span>Sent Today</span>
                        </span>
                      ) : remInfo.lastReminderSentAt ? (
                        <span className="text-zinc-400">
                          Sent: {formatDate(remInfo.lastReminderSentAt)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">No reminder sent</span>
                      )}
                    </div>
                  </div>

                  {/* STATS HIGHLIGHT */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenHistory(cust)}
                      className="text-left group/visits hover:bg-zinc-800/60 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Click to view customer invoice history"
                    >
                      <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider group-hover/visits:text-purple-300 flex items-center gap-1">
                        <span>Total Visits</span>
                        <Receipt className="h-2.5 w-2.5 text-purple-400" />
                      </span>
                      <span className="text-sm font-bold text-white group-hover/visits:text-purple-300 underline decoration-purple-500/50">
                        {cust.total_visits || 0} visits
                      </span>
                    </button>

                    <div className="p-1">
                      <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                        Total Spent
                      </span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {formatCurrency(cust.total_spent || 0, settings.currency_symbol)}
                      </span>
                    </div>
                  </div>

                  {/* DETAILS: EMAIL, BIRTHDAY, ANNIVERSARY, NOTES */}
                  {(cust.email || cust.birthday || cust.anniversary || cust.notes) && (
                    <div className="space-y-1.5 text-xs text-zinc-400 pt-1.5 border-t border-zinc-900">
                      {cust.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate">{cust.email}</span>
                        </div>
                      )}
                      {cust.birthday && (
                        <div className="flex items-center gap-1.5 text-pink-400">
                          <Gift className="h-3.5 w-3.5 shrink-0" />
                          <span>Birthday: {cust.birthday}</span>
                        </div>
                      )}
                      {cust.anniversary && (
                        <div className="flex items-center gap-1.5 text-rose-400">
                          <Heart className="h-3.5 w-3.5 shrink-0" />
                          <span>Anniversary: {cust.anniversary}</span>
                        </div>
                      )}
                      {cust.notes && (
                        <p className="text-[11px] text-zinc-300 bg-zinc-900/70 p-2 rounded-xl border border-zinc-800/60 italic line-clamp-2">
                          "{cust.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* CARD FOOTER ACTIONS */}
                <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-zinc-800/80">
                  {/* WHATSAPP TRIGGER BUTTON */}
                  <Button
                    size="sm"
                    onClick={() => handleSendWhatsAppReminder(cust, remInfo)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                      remInfo.reminderSentToday
                        ? "bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/40"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                    }`}
                    title="Send customized WhatsApp follow-up reminder in a new tab"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-200" />
                    <span>
                      {remInfo.reminderSentToday
                        ? "Resend WhatsApp Reminder"
                        : "Send WhatsApp Reminder"}
                    </span>
                  </Button>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleStartBill(cust)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>Bill Client</span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleOpenHistory(cust)}
                        className="px-2.5 py-1.5 rounded-xl text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="View all past invoices for this client"
                      >
                        <Receipt className="h-3 w-3 text-purple-400" />
                        <span>History</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(cust)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                        title="Edit Customer Profile"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(cust)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-900 transition-colors cursor-pointer"
                        title="Delete Customer Profile"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CUSTOMER INVOICE HISTORY DIALOG */}
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
                    {customerInvoices.length} Invoices
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
            {customerInvoices.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No past invoices recorded for this customer yet.
              </div>
            ) : (
              customerInvoices.map((inv) => (
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
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
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
                        let services = it.package_services;
                        if (
                          (!services || services.length === 0) &&
                          (it.item_type === "package" ||
                            (it.package_service_ids && it.package_service_ids.length > 0))
                        ) {
                          const catItem = catalog.find(
                            (c) =>
                              c.id === it.item_id ||
                              c.name.toLowerCase().trim() === it.item_name.toLowerCase().trim()
                          );
                          if (catItem && catItem.package_service_ids && catItem.package_service_ids.length > 0) {
                            services = catItem.package_service_ids
                              .map((sId) => catalog.find((c) => c.id === sId))
                              .filter(Boolean)
                              .map((s) => ({
                                service_id: s!.id,
                                service_name: s!.name,
                                price: Math.round(it.unit_price / catItem.package_service_ids!.length),
                                primary_staff_id: it.primary_staff_id,
                              }));
                          }
                        }

                        const isPkg = it.item_type === "package" || (services && services.length > 0);
                        const primaryStaffName = staff.find((s) => s.id === it.primary_staff_id)?.name;

                        return (
                          <div
                            key={idx}
                            className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-300 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {isPkg && (
                                  <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                    Package Combo
                                  </span>
                                )}
                                <span className="font-bold text-zinc-200">
                                  {it.item_name} (x{it.quantity})
                                </span>
                                {primaryStaffName && !isPkg && (
                                  <span className="text-[10px] text-purple-400">
                                    (Stylist: {primaryStaffName})
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-emerald-400">
                                {formatCurrency(it.total_price, settings.currency_symbol)}
                              </span>
                            </div>

                            {isPkg && services && services.length > 0 && (
                              <div className="mt-1 pl-2 border-l border-purple-700/60 text-[10.5px] text-zinc-400 space-y-0.5">
                                {services.map((ps, pIdx) => {
                                  const sName =
                                    staff.find((s) => s.id === ps.primary_staff_id)?.name ||
                                    primaryStaffName;
                                  return (
                                    <div key={pIdx} className="flex items-center justify-between">
                                      <span>
                                        • {ps.service_name}{" "}
                                        {sName && (
                                          <span className="text-purple-300 font-medium">({sName})</span>
                                        )}
                                      </span>
                                      <span className="text-emerald-400 font-mono">₹{ps.price}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="glow"
              onClick={() => {
                setIsHistoryModalOpen(false);
                handleStartBill(selectedHistoryCustomer);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Create New Bill</span>
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* CUSTOMER CREATE / EDIT MODAL */}
      <CustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        customerToEdit={editingCustomer}
        onSaved={() => {
          setEditingCustomer(null);
        }}
      />
    </div>
  );
}
