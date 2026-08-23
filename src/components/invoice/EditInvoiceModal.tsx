"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Invoice, InvoiceItem, CatalogItem, DiscountType, PaymentMode, InvoiceStatus } from "@/types";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SplitStaffModal } from "@/components/billing/SplitStaffModal";
import { calculateItemTotal, calculateInvoiceTotals } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileEdit,
  User,
  Phone,
  Mail,
  Plus,
  Minus,
  Trash2,
  Users,
  CreditCard,
  Receipt,
  Save,
  Calculator,
  Percent,
  Tag,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Printer,
  Layers,
} from "lucide-react";

export function EditInvoiceModal() {
  const {
    editingInvoice,
    setEditingInvoice,
    updateInvoice,
    setPrintInvoice,
    catalog,
    categories,
    staff,
    settings,
  } = useApp();

  // Local form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("flat");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [status, setStatus] = useState<InvoiceStatus>("paid");
  const [notes, setNotes] = useState("");

  // Catalog item adder
  const [selectedCatalogId, setSelectedCatalogId] = useState("");

  // Split Staff Modal
  const [activeSplitItem, setActiveSplitItem] = useState<InvoiceItem | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when editingInvoice changes
  useEffect(() => {
    if (editingInvoice) {
      setCustomerName(editingInvoice.customer_name || "");
      setCustomerPhone(editingInvoice.customer_phone || "");
      setCustomerEmail(editingInvoice.customer_email || "");

      const loadedItems = (editingInvoice.items || []).map((it) => {
        let pkgServices = it.package_services;
        if (
          it.item_type === "package" &&
          (!pkgServices || pkgServices.length === 0)
        ) {
          const catItem = catalog.find(
            (c) => c.id === it.item_id || c.name.toLowerCase().trim() === it.item_name.toLowerCase().trim()
          );
          if (catItem && catItem.package_service_ids && catItem.package_service_ids.length > 0) {
            const included = catItem.package_service_ids
              .map((sId) => catalog.find((c) => c.id === sId))
              .filter(Boolean);
            const count = included.length || 1;
            pkgServices = included.map((svc) => ({
              service_id: svc!.id,
              service_name: svc!.name,
              price: Math.round(it.unit_price / count),
              regular_price: svc!.price,
              duration_mins: svc!.duration_mins || 30,
              primary_staff_id: it.primary_staff_id,
            }));
          }
        }
        return {
          ...it,
          package_services: pkgServices,
        };
      });

      setItems(JSON.parse(JSON.stringify(loadedItems)));
      setDiscountType(editingInvoice.discount_type || "flat");
      setDiscountValue(editingInvoice.discount_value || 0);
      setPaymentMode(editingInvoice.payment_mode || "cash");
      setSplitCash(editingInvoice.payment_breakdown?.cash || 0);
      setSplitUpi(editingInvoice.payment_breakdown?.upi || 0);
      setSplitCard(editingInvoice.payment_breakdown?.card || 0);
      setStatus(editingInvoice.status || "paid");
      setNotes(editingInvoice.notes || "");
    }
  }, [editingInvoice, catalog]);

  // Recalculate totals
  const totals = useMemo(() => {
    return calculateInvoiceTotals({
      items,
      discountType,
      discountValue,
      taxEnabled: settings.tax_enabled,
      taxRate: settings.tax_rate,
    });
  }, [items, discountType, discountValue, settings.tax_enabled, settings.tax_rate]);

  if (!editingInvoice) return null;

  // Handlers for item modifications
  const handleItemQtyChange = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const total = calculateItemTotal(item.unit_price, newQty, item.discount);
          return { ...item, quantity: newQty, total_price: total };
        }
        return item;
      })
    );
  };

  const handleItemPriceChange = (itemId: string, newPrice: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          let reallocatedServices = item.package_services;
          if (item.item_type === "package" && item.package_services && item.package_services.length > 0) {
            const curTotal = item.unit_price || 1;
            let acc = 0;
            reallocatedServices = item.package_services.map((svc, idx) => {
              let p = Math.round((svc.price / curTotal) * newPrice);
              if (idx === item.package_services!.length - 1) {
                p = Math.max(0, newPrice - acc);
              } else {
                acc += p;
              }
              return { ...svc, price: p };
            });
          }
          const total = calculateItemTotal(newPrice, item.quantity, item.discount);
          return {
            ...item,
            unit_price: newPrice,
            total_price: total,
            package_services: reallocatedServices,
          };
        }
        return item;
      })
    );
  };

  const handlePackageServicePriceChange = (
    itemId: string,
    serviceId: string,
    newPrice: number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const services = (item.package_services || []).map((s) =>
            s.service_id === serviceId ? { ...s, price: Math.max(0, newPrice) } : s
          );
          const newUnit = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
          const newTotal = calculateItemTotal(newUnit, item.quantity, item.discount);
          return {
            ...item,
            package_services: services,
            unit_price: newUnit,
            total_price: newTotal,
          };
        }
        return item;
      })
    );
  };

  const handlePackageServiceStaffChange = (
    itemId: string,
    serviceId: string,
    staffId: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const services = (item.package_services || []).map((s) =>
            s.service_id === serviceId ? { ...s, primary_staff_id: staffId || undefined } : s
          );
          const firstStaff = services.find((s) => s.primary_staff_id)?.primary_staff_id;
          return {
            ...item,
            package_services: services,
            primary_staff_id: firstStaff || item.primary_staff_id,
          };
        }
        return item;
      })
    );
  };

  const handleAssignAllPackageServices = (itemId: string, staffId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const services = (item.package_services || []).map((s) => ({
            ...s,
            primary_staff_id: staffId || undefined,
          }));
          return {
            ...item,
            package_services: services,
            primary_staff_id: staffId || undefined,
          };
        }
        return item;
      })
    );
  };

  const handleItemDiscountChange = (itemId: string, newDiscount: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const total = calculateItemTotal(item.unit_price, item.quantity, newDiscount);
          return { ...item, discount: newDiscount, total_price: total };
        }
        return item;
      })
    );
  };

  const handleItemStaffChange = (itemId: string, staffId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, primary_staff_id: staffId || undefined } : item))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) {
      alert("An invoice must contain at least one line item.");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleAddCatalogItem = () => {
    if (!selectedCatalogId) return;
    const catItem = catalog.find((c) => c.id === selectedCatalogId);
    if (!catItem) return;

    let packageServices = undefined;
    if (catItem.type === "package" && catItem.package_service_ids && catItem.package_service_ids.length > 0) {
      const totalRegular = catItem.package_regular_price || catItem.price || 1;
      const includedServices = catItem.package_service_ids
        .map((sId) => catalog.find((c) => c.id === sId))
        .filter(Boolean);

      let allocatedSum = 0;
      packageServices = includedServices.map((svc, idx) => {
        let servicePrice = Math.round((svc!.price / totalRegular) * catItem.price);
        if (idx === includedServices.length - 1) {
          servicePrice = Math.max(0, catItem.price - allocatedSum);
        } else {
          allocatedSum += servicePrice;
        }
        return {
          service_id: svc!.id,
          service_name: svc!.name,
          price: servicePrice,
          regular_price: svc!.price,
          duration_mins: svc!.duration_mins || 30,
          primary_staff_id: undefined,
          primary_split_ratio: 100,
          secondary_split_ratio: 0,
        };
      });
    }

    const newItem: InvoiceItem = {
      id: `edit-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      item_id: catItem.id,
      item_name: catItem.name,
      item_type: catItem.type,
      quantity: 1,
      unit_price: catItem.price,
      discount: 0,
      total_price: catItem.price,
      package_service_ids: catItem.package_service_ids,
      package_regular_price: catItem.package_regular_price,
      package_services: packageServices,
      primary_staff_id: undefined,
      primary_split_ratio: 100,
      secondary_split_ratio: 0,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedCatalogId("");
  };

  const handleSaveInvoice = async (alsoPrint = false) => {
    if (!customerName.trim()) {
      alert("Please enter customer name.");
      return;
    }
    if (items.length === 0) {
      alert("Please have at least one line item in the invoice.");
      return;
    }

    // VALIDATE STYLIST FOR EVERY SERVICE & ALL PACKAGE SERVICES
    const unassignedItems: string[] = [];
    items.forEach((item) => {
      if (item.item_type === "service" && !item.primary_staff_id) {
        unassignedItems.push(`• ${item.item_name}`);
      } else if (item.item_type === "package") {
        if (item.package_services && item.package_services.length > 0) {
          const missing = item.package_services.filter((s) => !s.primary_staff_id);
          if (missing.length > 0) {
            unassignedItems.push(
              `• ${item.item_name} (Missing stylist for: ${missing.map((s) => s.service_name).join(", ")})`
            );
          }
        } else if (!item.primary_staff_id) {
          unassignedItems.push(`• ${item.item_name}`);
        }
      }
    });

    if (unassignedItems.length > 0) {
      alert(
        `⚠️ Stylist Selection Required\n\nPlease select a stylist for each service before saving:\n\n${unassignedItems.join(
          "\n"
        )}`
      );
      return;
    }

    try {
      setIsSaving(true);

      const splitBreakdown =
        paymentMode === "split"
          ? {
              cash: splitCash || 0,
              upi: splitUpi || 0,
              card: splitCard || 0,
            }
          : undefined;

      const updatedInvoice: Invoice = {
        ...editingInvoice,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        items,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        discount_type: discountType,
        discount_value: discountValue,
        tax_amount: totals.taxAmount,
        tax_rate: settings.tax_enabled ? settings.tax_rate : 0,
        grand_total: totals.grandTotal,
        payment_mode: paymentMode,
        payment_breakdown: splitBreakdown,
        status,
        notes: notes.trim(),
      };

      const saved = await updateInvoice(updatedInvoice);
      setEditingInvoice(null);

      if (alsoPrint) {
        setPrintInvoice(saved);
      }
    } catch (err) {
      console.error("Failed to update invoice:", err);
      alert("Failed to save updated invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={!!editingInvoice}
      onOpenChange={(open) => !open && setEditingInvoice(null)}
      maxWidth="3xl"
    >
      <DialogHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-white text-base flex items-center gap-2">
                <span>Edit Invoice #{editingInvoice.invoice_number}</span>
                <Badge
                  variant={status === "paid" ? "success" : status === "void" ? "destructive" : "warning"}
                  className="text-[10px] uppercase font-bold"
                >
                  {status}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Created on {formatDate(editingInvoice.created_at)} • Real-time Cloud Sync
              </DialogDescription>
            </div>
          </div>

          {/* STATUS SELECTOR */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <span className="text-[11px] text-zinc-400 font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
              className="h-8 px-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-3 max-h-[70vh] overflow-y-auto pr-1">
        {/* =========================================================================
            SECTION 1: CUSTOMER DETAILS
            ========================================================================= */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
            <User className="h-3.5 w-3.5 text-purple-400" />
            Customer Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* NAME */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Customer Name *</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* PHONE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-zinc-400">Mobile (Optional)</label>
                {customerPhone && (
                  <span
                    className={`text-[9px] font-mono font-medium ${
                      customerPhone.length === 10 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {customerPhone.length}/10
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="e.g. 9845112345"
                  className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: LINE ITEMS TABLE & CATALOG ADDER
            ========================================================================= */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
              <ShoppingBag className="h-3.5 w-3.5 text-purple-400" />
              Invoice Line Items ({items.length})
            </h4>

            {/* QUICK CATALOG ITEM ADDER */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCatalogId}
                onChange={(e) => setSelectedCatalogId(e.target.value)}
                className="h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-[220px]"
              >
                <option value="">+ Add Service / Product...</option>
                {catalog.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({formatCurrency(cat.price, settings.currency_symbol)})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!selectedCatalogId}
                onClick={handleAddCatalogItem}
                className="h-8 text-xs gap-1 border-purple-500/40 text-purple-300 hover:bg-purple-950/30"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>
          </div>

          {/* ITEM LIST */}
          <div className="space-y-2.5">
            {items.map((item, idx) => {
              const isService = item.item_type === "service";
              const isPackage = item.item_type === "package";
              const isProduct = item.item_type === "product";

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border space-y-2.5 ${
                    isPackage
                      ? "bg-purple-950/20 border-purple-900/60"
                      : "bg-zinc-900/90 border-zinc-800/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                      <strong className="text-xs sm:text-sm text-white">{item.item_name}</strong>
                      {isPackage ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
                          Package Combo
                        </span>
                      ) : (
                        <Badge variant={isService ? "purple" : "warning"} className="text-[9px] py-0 px-1.5">
                          {isService ? "Service" : "Product"}
                        </Badge>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-extrabold text-emerald-400">
                        {formatCurrency(item.total_price, settings.currency_symbol)}
                      </span>
                    </div>
                  </div>

                  {/* EDIT ROW: QTY, PRICE, DISCOUNT, STYLIST */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-zinc-950">
                    {/* QTY */}
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5">Quantity</span>
                      <div className="flex items-center bg-zinc-950 rounded-lg border border-zinc-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleItemQtyChange(item.id, item.quantity - 1)}
                          className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center font-mono text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleItemQtyChange(item.id, item.quantity + 1)}
                          className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* UNIT PRICE */}
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5">
                        {isPackage ? "Pkg Total Rate" : "Unit Price"} ({settings.currency_symbol})
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemPriceChange(item.id, Number(e.target.value) || 0)}
                        className="w-full h-7 px-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    {/* ITEM DISCOUNT */}
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5">Item Disc ({settings.currency_symbol})</span>
                      <input
                        type="number"
                        min="0"
                        value={item.discount}
                        onChange={(e) => handleItemDiscountChange(item.id, Number(e.target.value) || 0)}
                        className="w-full h-7 px-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-rose-300 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    {/* STYLIST SELECTOR & SPLIT (FOR NON-PACKAGES) */}
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5">
                        {isPackage ? "Actions" : `Stylist & Split ${isService && !item.primary_staff_id ? "*" : ""}`}
                      </span>
                      <div className="flex items-center gap-1">
                        {!isPackage && (
                          <select
                            value={item.primary_staff_id || ""}
                            onChange={(e) => handleItemStaffChange(item.id, e.target.value)}
                            className={`h-7 px-1.5 text-xs rounded-lg focus:outline-none focus:ring-1 flex-1 min-w-0 font-medium ${
                              isService && !item.primary_staff_id
                                ? "bg-amber-950/40 border border-amber-500/70 text-amber-200 focus:ring-amber-500 font-bold"
                                : "bg-zinc-950 border border-zinc-800 text-zinc-200 focus:ring-purple-500"
                            }`}
                          >
                            <option value="">
                              {isService ? "-- Select Stylist * --" : "-- Staff (Optional) --"}
                            </option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {!isPackage && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSplitItem(item);
                              setIsSplitModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg border text-[10px] shrink-0 transition-all ${
                              item.secondary_staff_id
                                ? "bg-pink-950/60 border-pink-700 text-pink-300"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                            title="Split staff commission"
                          >
                            <Users className="h-3 w-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ml-auto"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PACKAGE SERVICES BREAKDOWN */}
                  {isPackage && (
                    <div className="mt-2.5 pt-2.5 border-t border-purple-900/40 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <span className="text-[11px] font-bold text-pink-300 flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-pink-400" />
                          Included Services ({item.package_services?.length || 0}) & Stylist Selection:
                        </span>

                        {/* QUICK ASSIGN ALL */}
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
                            className="h-6 px-1.5 text-[10px] bg-zinc-950 border border-purple-800/60 rounded-lg text-purple-300 font-medium"
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

                      {/* SUB-SERVICES LIST */}
                      <div className="space-y-1 bg-zinc-950/80 p-2 rounded-xl border border-purple-900/30">
                        {(item.package_services || []).map((svc, sIdx) => {
                          const isUnassigned = !svc.primary_staff_id;

                          return (
                            <div
                              key={svc.service_id || sIdx}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-lg border text-xs ${
                                isUnassigned
                                  ? "bg-amber-950/30 border-amber-500/60"
                                  : "bg-zinc-900/80 border-zinc-800/80"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-zinc-200 truncate text-[11px]">
                                  • {svc.service_name}
                                </span>
                                {svc.regular_price && (
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    (MRP: ₹{svc.regular_price})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* CUSTOM AMOUNT */}
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
                                          Number(e.target.value) || 0
                                        )
                                      }
                                      className="w-full h-6 pl-4 pr-1 text-[11px] font-mono font-bold text-emerald-400 bg-zinc-950 border border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                </div>

                                {/* STYLIST SELECTOR */}
                                <select
                                  value={svc.primary_staff_id || ""}
                                  onChange={(e) =>
                                    handlePackageServiceStaffChange(
                                      item.id,
                                      svc.service_id,
                                      e.target.value
                                    )
                                  }
                                  className={`h-6 px-1.5 text-[10px] rounded-lg font-bold min-w-[130px] focus:outline-none focus:ring-1 ${
                                    isUnassigned
                                      ? "bg-amber-950/60 border border-amber-500 text-amber-200 focus:ring-amber-500"
                                      : "bg-zinc-950 border border-zinc-800 text-zinc-200 focus:ring-purple-500"
                                  }`}
                                >
                                  <option value="">-- Select Stylist * --</option>
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: DISCOUNTS, TAX & TOTALS
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* DISCOUNT & PAYMENT SETTINGS */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Tag className="h-3.5 w-3.5 text-purple-400" />
              Invoice Discount & Payment
            </h4>

            {/* INVOICE DISCOUNT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Bill Discount:</span>
                <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setDiscountType("flat")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      discountType === "flat" ? "bg-purple-600 text-white" : "text-zinc-400"
                    }`}
                  >
                    Flat ({settings.currency_symbol})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      discountType === "percentage" ? "bg-purple-600 text-white" : "text-zinc-400"
                    }`}
                  >
                    % Percent
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                  {discountType === "flat" ? settings.currency_symbol : "%"}
                </span>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-rose-300 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* PAYMENT MODE */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-900">
              <label className="text-[11px] font-medium text-zinc-400 block">Payment Method</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["cash", "upi", "card", "split"] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                      paymentMode === mode
                        ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* SPLIT BREAKDOWN INPUTS */}
              {paymentMode === "split" && (
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-zinc-900">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Cash:</span>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(Number(e.target.value) || 0)}
                      className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-400 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">UPI:</span>
                    <input
                      type="number"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(Number(e.target.value) || 0)}
                      className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-purple-400 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Card:</span>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={(e) => setSplitCard(Number(e.target.value) || 0)}
                      className="w-full h-7 px-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-blue-400 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* NOTES */}
            <div className="pt-2 border-t border-zinc-900">
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Invoice Notes / Remarks</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Special anniversary discount applied"
                className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* BILL SUMMARY & LIVE RECALCULATION */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="h-3.5 w-3.5 text-purple-400" />
              Updated Summary
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Items Subtotal:</span>
                <strong className="font-mono text-zinc-200">
                  {formatCurrency(totals.subtotal, settings.currency_symbol)}
                </strong>
              </div>

              {totals.discountAmount > 0 && (
                <div className="flex items-center justify-between text-rose-400">
                  <span>Total Discount:</span>
                  <span className="font-mono font-semibold">
                    -{formatCurrency(totals.discountAmount, settings.currency_symbol)}
                  </span>
                </div>
              )}

              {settings.tax_enabled && (
                <div className="flex items-center justify-between text-zinc-400">
                  <span>GST / Tax ({settings.tax_rate}%):</span>
                  <span className="font-mono font-semibold text-zinc-300">
                    +{formatCurrency(totals.taxAmount, settings.currency_symbol)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-bold text-white">Grand Total:</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
              <span>Saving will instantly update local records and cloud PostgreSQL for all devices.</span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-zinc-800">
        <Button
          variant="secondary"
          disabled={isSaving}
          onClick={() => setEditingInvoice(null)}
          className="text-xs"
        >
          Cancel
        </Button>

        <Button
          variant="outline"
          disabled={isSaving}
          onClick={() => handleSaveInvoice(true)}
          className="text-xs gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-950/40"
        >
          <Printer className="h-3.5 w-3.5" />
          Save & Print Updated
        </Button>

        <Button
          variant="glow"
          disabled={isSaving}
          onClick={() => handleSaveInvoice(false)}
          className="text-xs gap-1.5 font-bold"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{isSaving ? "Saving Changes..." : "Save & Update Invoice"}</span>
        </Button>
      </DialogFooter>

      {/* SPLIT STAFF MODAL INSTANCE */}
      <SplitStaffModal
        item={activeSplitItem}
        open={isSplitModalOpen}
        onOpenChange={setIsSplitModalOpen}
        onSave={(updates) => {
          if (activeSplitItem) {
            setItems((prev) =>
              prev.map((i) => (i.id === activeSplitItem.id ? { ...i, ...updates } : i))
            );
          }
        }}
      />
    </Dialog>
  );
}
