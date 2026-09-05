"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AppProvider, useApp } from "@/context/AppContext";
import { WheelInventoryItem, WheelItemCategory } from "@/types/rewards";
import { generateUUID } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Sparkles,
  Gift,
  Tag,
  Percent,
  Scissors,
  Package,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  Layers,
  Filter,
} from "lucide-react";

const CATEGORY_META: Record<
  WheelItemCategory,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  gift: {
    label: "Gifts",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    icon: Gift,
  },
  offer: {
    label: "Offers",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: Tag,
  },
  discount_coupon: {
    label: "Discount Coupons",
    badgeClass: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    icon: Percent,
  },
  free_service: {
    label: "Free Service Coupons",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    icon: Scissors,
  },
};

function WheelInventoryContent() {
  const {
    wheelInventory,
    saveWheelInventoryItem,
    deleteWheelInventoryItem,
    settings,
    setIsSpinWheelOpen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | WheelItemCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WheelInventoryItem | null>(null);
  const [modalForm, setModalForm] = useState<{
    id?: string;
    title: string;
    category: WheelItemCategory;
    quantity: number;
    is_active: boolean;
    color: string;
  }>({
    title: "",
    category: "free_service",
    quantity: 10,
    is_active: true,
    color: "#8b5cf6",
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // KPIs
  const stats = useMemo(() => {
    const totalTypes = wheelInventory.length;
    const totalUnits = wheelInventory.reduce((acc, item) => acc + item.quantity, 0);
    const lowStockCount = wheelInventory.filter((item) => item.quantity < 3).length;
    const activeCount = wheelInventory.filter((item) => item.is_active).length;
    return { totalTypes, totalUnits, lowStockCount, activeCount };
  }, [wheelInventory]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return wheelInventory.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (statusFilter === "active" && !item.is_active) return false;
      if (statusFilter === "inactive" && item.is_active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [wheelInventory, selectedCategory, statusFilter, searchQuery]);

  // Quick adjust
  const handleQuickAdjust = async (item: WheelInventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    await saveWheelInventoryItem({ ...item, quantity: newQty });
    showNotification(`Updated "${item.title}" stock to ${newQty}`);
  };

  // Inline numeric input
  const handleInlineQtyChange = async (item: WheelInventoryItem, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const newQty = Math.max(0, num);
    await saveWheelInventoryItem({ ...item, quantity: newQty });
  };

  // Toggle active
  const handleToggleActive = async (item: WheelInventoryItem) => {
    const updated = { ...item, is_active: !item.is_active };
    await saveWheelInventoryItem(updated);
    showNotification(`"${item.title}" is now ${updated.is_active ? "Active" : "Inactive"}`);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalForm({
      title: "",
      category: "free_service",
      quantity: 10,
      is_active: true,
      color: "#8b5cf6",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: WheelInventoryItem) => {
    setEditingItem(item);
    setModalForm({
      id: item.id,
      title: item.title,
      category: item.category,
      quantity: item.quantity,
      is_active: item.is_active,
      color: item.color || "#8b5cf6",
    });
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title.trim()) return;

    const itemToSave: WheelInventoryItem = {
      id: editingItem?.id || modalForm.id || generateUUID(),
      title: modalForm.title.trim(),
      category: modalForm.category,
      quantity: Math.max(0, modalForm.quantity || 0),
      is_active: modalForm.is_active,
      color: modalForm.color || "#8b5cf6",
      created_at: editingItem?.created_at || new Date().toISOString(),
    };

    await saveWheelInventoryItem(itemToSave);
    setIsModalOpen(false);
    showNotification(`Saved reward item: "${itemToSave.title}"`);
  };

  // Delete Item
  const handleDeleteItem = async (item: WheelInventoryItem) => {
    if (confirm(`Delete "${item.title}" from the wheel inventory?`)) {
      await deleteWheelInventoryItem(item.id);
      showNotification(`Deleted "${item.title}"`);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-md shadow-purple-600/30 shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Spin-the-Wheel Inventory
                </h1>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-bold">
                  Admin Dashboard
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Independent Reward Stock Pool • {settings.salon_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSpinWheelOpen(true)}
              className="hidden sm:flex items-center gap-1.5 border-purple-500/30 text-purple-300 hover:bg-purple-500/15 text-xs font-bold"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Test Wheel</span>
            </Button>

            <Link
              href="/spin"
              target="_blank"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Tablet Kiosk Mode</span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to POS</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6 space-y-6">
        {/* TOAST / NOTIFICATION */}
        {notification && (
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* 1. KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="p-4 bg-zinc-900/70 border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400">Total Reward Types</span>
              <div className="h-8 w-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{stats.totalTypes}</span>
              <span className="text-[11px] text-zinc-500">Configured Slices</span>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400">Total Available Stock</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">{stats.totalUnits}</span>
              <span className="text-[11px] text-zinc-500">Units in Pool</span>
            </div>
          </Card>

          <Card
            className={`p-4 border transition-colors ${
              stats.lowStockCount > 0
                ? "bg-rose-950/30 border-rose-500/40"
                : "bg-zinc-900/70 border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold ${
                  stats.lowStockCount > 0 ? "text-rose-300" : "text-zinc-400"
                }`}
              >
                Low Stock Warning (&lt; 3)
              </span>
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                  stats.lowStockCount > 0
                    ? "bg-rose-500/20 text-rose-400 animate-pulse"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-black font-mono ${
                  stats.lowStockCount > 0 ? "text-rose-400" : "text-white"
                }`}
              >
                {stats.lowStockCount}
              </span>
              <span className="text-[11px] text-zinc-500">Need replenishment</span>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400">Active on Wheel</span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300 font-mono">{stats.activeCount}</span>
              <span className="text-[11px] text-zinc-500">of {stats.totalTypes} active</span>
            </div>
          </Card>
        </div>

        {/* 2. CONTROLS BAR: SEARCH, CATEGORY TABS & ADD NEW */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800/80">
          {/* SEARCH */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search rewards by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* STATUS FILTER & ADD BUTTON */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <Button
              variant="accent"
              onClick={handleOpenAdd}
              className="gap-1.5 text-xs font-bold shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Reward</span>
            </Button>
          </div>
        </div>

        {/* 3. CATEGORY PILL TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === "all"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            All Categories ({wheelInventory.length})
          </button>

          {(Object.keys(CATEGORY_META) as WheelItemCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = wheelInventory.filter((i) => i.category === cat).length;
            const isSelected = selectedCategory === cat;
            const Icon = meta.icon;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{meta.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-950/60 text-zinc-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. INVENTORY TABLE & CARDS */}
        <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3.5">Reward Item</th>
                  <th className="p-3.5">Category Type</th>
                  <th className="p-3.5 text-center">Stock Quantity</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Quick Stock Controls</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500 text-xs">
                      No rewards match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLowStock = item.quantity < 3;
                    const isOutOfStock = item.quantity === 0;
                    const meta = CATEGORY_META[item.category] || CATEGORY_META.offer;
                    const Icon = meta.icon;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-zinc-900/40 transition-colors ${
                          isOutOfStock ? "opacity-75 bg-zinc-900/20" : ""
                        }`}
                      >
                        {/* ITEM NAME & COLOR */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                              style={{ backgroundColor: item.color || "#8b5cf6" }}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                                <span>{item.title}</span>
                                {isOutOfStock && (
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                                    Out of Stock
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500">
                                ID: {item.id.slice(-8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* CATEGORY BADGE */}
                        <td className="p-3.5">
                          <Badge className={`${meta.badgeClass} text-[10px] font-bold border`}>
                            {meta.label}
                          </Badge>
                        </td>

                        {/* QUANTITY WITH LOW STOCK ALERT */}
                        <td className="p-3.5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-lg font-mono font-black px-2.5 py-0.5 rounded-lg border ${
                                isOutOfStock
                                  ? "bg-rose-950/80 text-rose-400 border-rose-500/50"
                                  : isLowStock
                                  ? "bg-rose-950/50 text-rose-300 border-rose-500/40 animate-pulse"
                                  : "bg-zinc-900 text-emerald-400 border-zinc-800"
                              }`}
                            >
                              {item.quantity}
                            </span>
                            {isLowStock && !isOutOfStock && (
                              <span className="text-[9px] font-bold text-rose-400 mt-0.5 flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Low Stock</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STATUS TOGGLE */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                              item.is_active
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                            }`}
                          >
                            {item.is_active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 text-zinc-500" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* QUICK CONTROLS: -1, INLINE INPUT, +1, +5 */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleQuickAdjust(item, -1)}
                              disabled={item.quantity <= 0}
                              className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
                              title="Deduct 1"
                            >
                              <Minus className="h-3 w-3" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleInlineQtyChange(item, e.target.value)}
                              className="w-14 text-center font-mono font-bold text-xs bg-zinc-950 border border-zinc-800 rounded-lg py-1 text-white focus:outline-none focus:border-purple-500"
                            />

                            <button
                              onClick={() => handleQuickAdjust(item, 1)}
                              className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-emerald-400 flex items-center justify-center cursor-pointer transition-colors"
                              title="Add 1"
                            >
                              <Plus className="h-3 w-3" />
                            </button>

                            <button
                              onClick={() => handleQuickAdjust(item, 5)}
                              className="px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 text-[10px] font-bold cursor-pointer transition-colors"
                              title="Add 5"
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        {/* ACTIONS: EDIT / DELETE */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer transition-colors"
                              title="Edit Reward"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-800 cursor-pointer transition-colors"
                              title="Delete Reward"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-zinc-800/60 bg-zinc-950/80 py-3 px-4 text-center">
        <p className="text-xs text-zinc-500">
          Belezia Salon POS • Wheel Rewards Inventory Management • Automated Realtime Cloud Decrement
        </p>
      </footer>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 overflow-hidden">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>{editingItem ? "Edit Wheel Reward" : "Add New Wheel Reward"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Define the reward title, category, initial stock pool, and slice color.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Item Name / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Hair Spa, 20% Discount"
                  value={modalForm.title}
                  onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                    Category Type
                  </label>
                  <select
                    value={modalForm.category}
                    onChange={(e) => setModalForm({ ...modalForm, category: e.target.value as WheelItemCategory })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="gift">Gifts (gift)</option>
                    <option value="offer">Offers (offer)</option>
                    <option value="discount_coupon">Discount Coupons (discount_coupon)</option>
                    <option value="free_service">Free Service Coupons (free_service)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={modalForm.quantity}
                    onChange={(e) => setModalForm({ ...modalForm, quantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                    Slice Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={modalForm.color}
                      onChange={(e) => setModalForm({ ...modalForm, color: e.target.value })}
                      className="h-8 w-12 rounded bg-zinc-900 border border-zinc-800 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-zinc-400">{modalForm.color}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalForm.is_active}
                      onChange={(e) => setModalForm({ ...modalForm, is_active: e.target.checked })}
                      className="rounded bg-zinc-950 border-zinc-700 text-purple-600 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-white">Active on Wheel</span>
                  </label>
                </div>
              </div>

              <DialogFooter className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs border-zinc-800 text-zinc-400"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" size="sm" className="gap-1 text-xs font-bold">
                  <Save className="h-3.5 w-3.5" />
                  <span>{editingItem ? "Update Reward" : "Save Reward"}</span>
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function WheelInventoryPage() {
  return (
    <AppProvider>
      <WheelInventoryContent />
    </AppProvider>
  );
}
