"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { InvoiceItem, PackageServiceItem } from "@/types";
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
  Scissors,
  Check,
  Layers,
  ChevronDown,
} from "lucide-react";
import { SplitStaffModal } from "./SplitStaffModal";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { calculateItemTotal } from "@/lib/calculations";

export function CartItemList() {
  const { draftItems, updateDraftItem, removeDraftItem, staff, settings, catalog } = useApp();
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

  // PACKAGE SERVICE HANDLERS: EDIT SERVICE PRICE
  const handlePackageServicePriceChange = (
    itemId: string,
    serviceId: string,
    newPrice: number
  ) => {
    const targetItem = draftItems.find((i) => i.id === itemId);
    if (!targetItem) return;

    let services = targetItem.package_services;
    if (!services || services.length === 0) {
      // Fallback build if missing
      services = (targetItem.package_service_ids || [])
        .map((sId) => catalog.find((c) => c.id === sId))
        .filter(Boolean)
        .map((svc) => ({
          service_id: svc!.id,
          service_name: svc!.name,
          price: Math.round(targetItem.unit_price / (targetItem.package_service_ids?.length || 1)),
          regular_price: svc!.price,
          duration_mins: svc!.duration_mins || 30,
          primary_staff_id: targetItem.primary_staff_id,
        }));
    }

    const updatedServices = services.map((svc) =>
      svc.service_id === serviceId ? { ...svc, price: Math.max(0, newPrice) } : svc
    );

    const newUnitPrice = updatedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const newTotalPrice = calculateItemTotal(newUnitPrice, targetItem.quantity, targetItem.discount);

    updateDraftItem(itemId, {
      package_services: updatedServices,
      unit_price: newUnitPrice,
      total_price: newTotalPrice,
    });
  };

  // PACKAGE SERVICE HANDLERS: EDIT SERVICE STYLIST
  const handlePackageServiceStaffChange = (
    itemId: string,
    serviceId: string,
    staffId: string
  ) => {
    const targetItem = draftItems.find((i) => i.id === itemId);
    if (!targetItem) return;

    let services = targetItem.package_services;
    if (!services || services.length === 0) {
      services = (targetItem.package_service_ids || [])
        .map((sId) => catalog.find((c) => c.id === sId))
        .filter(Boolean)
        .map((svc) => ({
          service_id: svc!.id,
          service_name: svc!.name,
          price: Math.round(targetItem.unit_price / (targetItem.package_service_ids?.length || 1)),
          regular_price: svc!.price,
          duration_mins: svc!.duration_mins || 30,
          primary_staff_id: undefined,
        }));
    }

    const updatedServices = services.map((svc) =>
      svc.service_id === serviceId ? { ...svc, primary_staff_id: staffId || undefined } : svc
    );

    const firstAssigned = updatedServices.find((s) => s.primary_staff_id)?.primary_staff_id;

    updateDraftItem(itemId, {
      package_services: updatedServices,
      primary_staff_id: firstAssigned,
    });
  };

  // PACKAGE SERVICE HANDLERS: ASSIGN ALL SERVICES TO 1 STYLIST
  const handleAssignAllPackageServices = (itemId: string, staffId: string) => {
    const targetItem = draftItems.find((i) => i.id === itemId);
    if (!targetItem) return;

    let services = targetItem.package_services;
    if (!services || services.length === 0) {
      services = (targetItem.package_service_ids || [])
        .map((sId) => catalog.find((c) => c.id === sId))
        .filter(Boolean)
        .map((svc) => ({
          service_id: svc!.id,
          service_name: svc!.name,
          price: Math.round(targetItem.unit_price / (targetItem.package_service_ids?.length || 1)),
          regular_price: svc!.price,
          duration_mins: svc!.duration_mins || 30,
          primary_staff_id: staffId || undefined,
        }));
    } else {
      services = services.map((svc) => ({
        ...svc,
        primary_staff_id: staffId || undefined,
      }));
    }

    updateDraftItem(itemId, {
      package_services: services,
      primary_staff_id: staffId || undefined,
    });
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
        const isProduct = item.item_type === "product";

        // Check if package has missing stylist for ANY sub-service
        const packageServices = item.package_services || [];
        const isPackageStylistMissing =
          isPackage &&
          (packageServices.length > 0
            ? packageServices.some((s) => !s.primary_staff_id)
            : !item.primary_staff_id);

        const isStylistMissing = isService ? !item.primary_staff_id : isPackageStylistMissing;

        return (
          <div
            key={item.id}
            className={`group relative rounded-2xl border p-3.5 backdrop-blur-xl transition-all duration-200 ${
              isStylistMissing
                ? "border-amber-500/60 bg-amber-950/15 hover:border-amber-500/80 shadow-md shadow-amber-950/20"
                : isPackage
                ? "border-purple-900/60 bg-purple-950/20 hover:border-pink-500/50"
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
                      Package Combo
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

            {/* ROW 2: CONTROLS - QUANTITY, PACKAGE RATE, AND DISCOUNT */}
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

              {/* UNIT PRICE */}
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
                    value={item.unit_price === 0 ? "" : item.unit_price}
                    placeholder="0"
                    onChange={(e) => {
                      const newRate = e.target.value === "" ? 0 : Number(e.target.value) || 0;
                      // If package, proportionally distribute across services
                      if (isPackage && item.package_services && item.package_services.length > 0) {
                        const curTotal = item.unit_price || 1;
                        let acc = 0;
                        const reallocated = item.package_services.map((svc, idx) => {
                          let p = Math.round((svc.price / curTotal) * newRate);
                          if (idx === item.package_services!.length - 1) {
                            p = Math.max(0, newRate - acc);
                          } else {
                            acc += p;
                          }
                          return { ...svc, price: p };
                        });
                        updateDraftItem(item.id, {
                          unit_price: newRate,
                          package_services: reallocated,
                        });
                      } else {
                        updateDraftItem(item.id, { unit_price: newRate });
                      }
                    }}
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

            {/* ===================================================================
                PACKAGE SPECIAL: PER-SERVICE STYLIST SELECTION & CUSTOM AMOUNT
                =================================================================== */}
            {isPackage ? (
              <div className="mt-3 pt-3 border-t border-purple-900/40 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-pink-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-pink-400" />
                    Included Services ({packageServices.length || 0}) & Stylist Selection:
                  </span>

                  {/* QUICK ASSIGN ALL TO ONE STYLIST */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400">Quick Assign All:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignAllPackageServices(item.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="h-6 px-1.5 text-[10px] bg-zinc-900 border border-purple-800/60 rounded-lg text-purple-300 font-medium"
                    >
                      <option value="" disabled>
                        ⚡ Choose Stylist
                      </option>
                      {staff
                        .filter((s) => s.status === "active")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.role})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* INDIVIDUAL SERVICES IN PACKAGE */}
                <div className="space-y-1.5 bg-zinc-950/70 p-2.5 rounded-xl border border-purple-900/30">
                  {packageServices.map((svc, sIdx) => {
                    const isSvcUnassigned = !svc.primary_staff_id;
                    const assignedStaff = staff.find((s) => s.id === svc.primary_staff_id);

                    return (
                      <div
                        key={svc.service_id || sIdx}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border transition-all ${
                          isSvcUnassigned
                            ? "bg-amber-950/30 border-amber-500/60"
                            : "bg-zinc-900/80 border-zinc-800/80"
                        }`}
                      >
                        {/* SERVICE TITLE & REGULAR MRP */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Scissors className="h-3 w-3 text-pink-400 shrink-0" />
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {svc.service_name}
                          </span>
                          {svc.regular_price && (
                            <span className="text-[10px] text-zinc-500 font-mono">
                              (MRP: ₹{svc.regular_price})
                            </span>
                          )}
                        </div>

                        {/* CUSTOM AMOUNT & STYLIST SELECTOR */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* EDITABLE SERVICE PRICE */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-zinc-400 font-semibold">Amt:</span>
                            <div className="relative w-16">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                value={svc.price === 0 ? "" : svc.price}
                                placeholder="0"
                                onChange={(e) =>
                                  handlePackageServicePriceChange(
                                    item.id,
                                    svc.service_id,
                                    e.target.value === "" ? 0 : Number(e.target.value) || 0
                                  )
                                }
                                className="w-full h-6 pl-4 pr-1 text-[11px] font-mono font-bold text-emerald-400 bg-zinc-950 border border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                title="Customise service amount inside this package"
                              />
                            </div>
                          </div>

                          {/* PER-SERVICE STYLIST SELECTOR */}
                          <div className="flex items-center gap-1 min-w-[150px]">
                            <select
                              value={svc.primary_staff_id || ""}
                              onChange={(e) =>
                                handlePackageServiceStaffChange(
                                  item.id,
                                  svc.service_id,
                                  e.target.value
                                )
                              }
                              className={`h-6 px-2 text-[10px] rounded-lg font-bold flex-1 transition-all focus:outline-none focus:ring-1 ${
                                isSvcUnassigned
                                  ? "bg-amber-950/60 border border-amber-500 text-amber-200 focus:ring-amber-500"
                                  : "bg-zinc-950 border border-zinc-800 text-zinc-200 focus:ring-purple-500"
                              }`}
                            >
                              <option value="">-- Select Stylist * --</option>
                              {staff.map((s) => (
                                <option key={s.id} value={s.id} disabled={s.status !== "active"}>
                                  {s.name} ({s.role}) {s.status === "on_leave" ? "[Leave]" : ""}
                                </option>
                              ))}
                            </select>
                            {assignedStaff && (
                              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-zinc-500">
                    💡 Total package rate adjusts automatically as you customize individual service amounts.
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDraftItem(item.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors flex items-center gap-1 text-xs"
                    title="Remove package"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Package</span>
                  </button>
                </div>
              </div>
            ) : (
              /* REGULAR SERVICE / PRODUCT STYLIST & SPLIT ROW */
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-900/60 flex-wrap">
                {/* STYLIST SELECTOR & SPLIT BUTTON */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                  <User
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isStylistMissing ? "text-amber-400" : "text-purple-400"
                    }`}
                  />
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
                      {isService ? "-- Select Stylist * --" : "-- Assign Staff (Optional) --"}
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
            )}
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

