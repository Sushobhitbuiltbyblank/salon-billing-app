"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { InvoiceItem } from "@/types";
import {
  Trash2,
  Users,
  User,
  Plus,
  Minus,
  Edit2,
  Sparkles,
  ShoppingBag,
  Clock,
  AlertCircle,
} from "lucide-react";
import { SplitStaffModal } from "./SplitStaffModal";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function CartItemList() {
  const { draftItems, updateDraftItem, removeDraftItem, staff, settings } = useApp();
  const [activeSplitItem, setActiveSplitItem] = useState<InvoiceItem | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  const handleOpenSplit = (item: InvoiceItem) => {
    setActiveSplitItem(item);
    setIsSplitModalOpen(true);
  };

  const getStaffName = (staffId?: string) => {
    if (!staffId) return null;
    const found = staff.find((s) => s.id === staffId);
    return found ? found.name : null;
  };

  if (draftItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-950/40 text-purple-400 mb-3">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-zinc-300">Invoice is currently empty</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
          Select services or retail products from the catalog to add them to this invoice.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {draftItems.map((item, index) => {
        const isService = item.item_type === "service";
        const isPackage = item.item_type === "package";
        const isStylistRequired = isService || isPackage;
        const isStylistMissing = isStylistRequired && !item.primary_staff_id;
        const primaryName = getStaffName(item.primary_staff_id);
        const secondaryName = getStaffName(item.secondary_staff_id);

        return (
          <div
            key={item.id}
            className={`group relative rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-200 ${
              isStylistMissing
                ? "border-amber-500/60 bg-amber-950/15 hover:border-amber-500/80 shadow-md shadow-amber-950/20"
                : "border-zinc-800/90 bg-zinc-950/80 hover:border-purple-500/40 hover:bg-zinc-900/90"
            }`}
          >
            {/* ROW 1: ITEM NAME, BADGE, AND LINE TOTAL */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-mono font-bold text-zinc-500">
                    #{index + 1}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {item.item_name}
                  </h4>
                  {isPackage ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
                      Package
                    </span>
                  ) : (
                    <Badge
                      variant={isService ? "purple" : "warning"}
                      className="text-[9px] py-0 px-1.5"
                    >
                      {isService ? "Service" : "Product"}
                    </Badge>
                  )}
                  {isStylistMissing && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      <AlertCircle className="h-2.5 w-2.5" />
                      Stylist Required
                    </span>
                  )}
                </div>
              </div>

              {/* LINE TOTAL */}
              <div className="text-right">
                <div className="text-sm font-extrabold text-emerald-400 font-mono">
                  {formatCurrency(item.total_price, settings.currency_symbol)}
                </div>
                {item.discount > 0 && (
                  <span className="text-[10px] text-rose-400 line-through font-mono block">
                    {formatCurrency(item.unit_price * item.quantity, settings.currency_symbol)}
                  </span>
                )}
              </div>
            </div>

            {/* ROW 2: EDITABLE PRICE, QTY CONTROLS, AND DISCOUNT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-zinc-900">
              {/* QUANTITY */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400 w-7">Qty:</span>
                <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateDraftItem(item.id, { quantity: item.quantity - 1 });
                      } else {
                        removeDraftItem(item.id);
                      }
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-zinc-200 font-mono">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDraftItem(item.id, { quantity: item.quantity + 1 })}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* UNIT PRICE (MANUAL PRICE EDITING ALLOWED) */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400 w-9">Rate:</span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                    {settings.currency_symbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateDraftItem(item.id, { unit_price: Number(e.target.value) || 0 })
                    }
                    className="w-full h-7 pl-5 pr-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                    title="Edit custom unit price"
                  />
                </div>
              </div>

              {/* ITEM DISCOUNT */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400 w-10">Disc:</span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-rose-500 font-mono">
                    -
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={item.discount}
                    onChange={(e) =>
                      updateDraftItem(item.id, { discount: Number(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full h-7 pl-5 pr-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-rose-300 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    title="Item specific discount"
                  />
                </div>
              </div>
            </div>

            {/* ROW 3: SPLIT-STAFF ASSIGNMENT PILL & DELETE ACTION */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-900/60 flex-wrap">
              {/* STYLIST SELECTOR & SPLIT BUTTON */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                <User className={`h-3.5 w-3.5 shrink-0 ${isStylistMissing ? "text-amber-400" : "text-purple-400"}`} />
                <select
                  value={item.primary_staff_id || ""}
                  onChange={(e) =>
                    updateDraftItem(item.id, { primary_staff_id: e.target.value || undefined })
                  }
                  className={`h-7 px-2 text-xs rounded-lg font-medium flex-1 max-w-[200px] transition-all focus:outline-none focus:ring-1 ${
                    isStylistMissing
                      ? "bg-amber-950/40 border border-amber-500/70 text-amber-200 focus:ring-amber-500 font-bold"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 focus:ring-purple-500"
                  }`}
                >
                  <option value="">
                    {isStylistRequired ? "-- Select Stylist * --" : "-- Assign Staff (Optional) --"}
                  </option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.status !== "active"}>
                      {s.name} ({s.role}) {s.status === "on_leave" ? "[Leave]" : ""}
                    </option>
                  ))}
                </select>

                {/* SPLIT COMMISSION TRIGGER */}
                <button
                  type="button"
                  onClick={() => handleOpenSplit(item)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                    item.secondary_staff_id
                      ? "bg-pink-950/60 border-pink-700/60 text-pink-300 shadow-sm"
                      : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Split commission between 2 stylists"
                >
                  <Users className="h-3 w-3" />
                  <span>
                    {item.secondary_staff_id
                      ? `Split (${item.primary_split_ratio}% / ${item.secondary_split_ratio}%)`
                      : "Split (2 Staff)"}
                  </span>
                </button>
              </div>

              {/* REMOVE BUTTON */}
              <button
                type="button"
                onClick={() => removeDraftItem(item.id)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                title="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* SPLIT MODAL INSTANCE */}
      <SplitStaffModal
        item={activeSplitItem}
        open={isSplitModalOpen}
        onOpenChange={setIsSplitModalOpen}
        onSave={(updates) => {
          if (activeSplitItem) {
            updateDraftItem(activeSplitItem.id, updates);
          }
        }}
      />
    </div>
  );
}
