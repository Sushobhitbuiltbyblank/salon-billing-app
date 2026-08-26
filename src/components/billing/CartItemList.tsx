"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { InvoiceItem, PackageServiceItem } from "@/types";
import {
  Trash2,
  Users,
  User,
  UserPlus,
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
  X,
  Tag,
} from "lucide-react";
import { SplitStaffModal } from "./SplitStaffModal";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { calculateItemTotal } from "@/lib/calculations";

export interface KnownGuestProfile {
  name: string;
  gender?: "female" | "male" | "other" | "unspecified";
  phone?: string;
}

export function CartItemList() {
  const {
    draftItems,
    updateDraftItem,
    removeDraftItem,
    staff,
    settings,
    catalog,
    draftCustomer,
  } = useApp();
  const [activeSplitItem, setActiveSplitItem] = useState<InvoiceItem | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [openGuestItemId, setOpenGuestItemId] = useState<string | null>(null);

  // Form states for adding / editing person on a service
  const [guestFormName, setGuestFormName] = useState("");
  const [guestFormGender, setGuestFormGender] = useState<"female" | "male" | "other" | "unspecified">("unspecified");
  const [guestFormPhone, setGuestFormPhone] = useState("");

  // Collect unique guest profiles from draft customer and current cart items (including package sub-services)
  const knownGuests: KnownGuestProfile[] = useMemo(() => {
    const map = new Map<string, KnownGuestProfile>();
    if (
      draftCustomer?.name &&
      draftCustomer.name.trim() &&
      draftCustomer.name.toLowerCase() !== "walk-in guest"
    ) {
      map.set(draftCustomer.name.trim().toLowerCase(), {
        name: draftCustomer.name.trim(),
        gender: draftCustomer.gender || "unspecified",
        phone: draftCustomer.phone || "",
      });
    }
    draftItems.forEach((it) => {
      if (it.guest_name && it.guest_name.trim()) {
        const key = it.guest_name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            name: it.guest_name.trim(),
            gender: it.guest_gender || "unspecified",
            phone: it.guest_phone || "",
          });
        }
      }
      if (it.package_services) {
        it.package_services.forEach((s) => {
          if (s.guest_name && s.guest_name.trim()) {
            const key = s.guest_name.trim().toLowerCase();
            if (!map.has(key)) {
              map.set(key, {
                name: s.guest_name.trim(),
                gender: s.guest_gender || "unspecified",
                phone: s.guest_phone || "",
              });
            }
          }
        });
      }
    });
    return Array.from(map.values());
  }, [draftCustomer, draftItems]);

  // Compute multi-guest summary if items or package sub-services have distinct person tags
  const multiGuestSummary = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    draftItems.forEach((it) => {
      if (it.item_type === "package" && it.package_services && it.package_services.length > 0) {
        const hasSubGuest = it.package_services.some((s) => s.guest_name && s.guest_name.trim());
        if (hasSubGuest) {
          it.package_services.forEach((s) => {
            const gName = (s.guest_name || "").trim() || (it.guest_name || "").trim() || (draftCustomer?.name || "General");
            const current = map.get(gName) || { count: 0, total: 0 };
            map.set(gName, {
              count: current.count + 1,
              total: current.total + (Number(s.price) || 0),
            });
          });
          return;
        }
      }

      const gName = (it.guest_name || "").trim() || (draftCustomer?.name || "General");
      const current = map.get(gName) || { count: 0, total: 0 };
      map.set(gName, {
        count: current.count + it.quantity,
        total: current.total + (Number(it.total_price) || 0),
      });
    });
    const result: { name: string; count: number; total: number }[] = [];
    map.forEach((val, key) => {
      result.push({ name: key, count: val.count, total: val.total });
    });
    return result;
  }, [draftItems, draftCustomer?.name]);

  // ASSIGN ALL SERVICES IN PACKAGE TO ONE PERSON
  const handleAssignAllPackageGuests = (
    itemId: string,
    guestProfile: { name: string; gender?: "female" | "male" | "other" | "unspecified"; phone?: string }
  ) => {
    const targetItem = draftItems.find((i) => i.id === itemId);
    if (!targetItem) return;

    let services = targetItem.package_services;
    if (!services || services.length === 0) {
      const packageCatalogItem = catalog.find((c) => c.id === targetItem.item_id);
      const serviceIds =
        targetItem.package_service_ids || packageCatalogItem?.package_service_ids || [];
      services = serviceIds
        .map((sId) => {
          const s = catalog.find((c) => c.id === sId);
          if (!s) return null;
          return {
            service_id: s.id,
            service_name: s.name,
            price: Number(s.price) || 0,
            regular_price: Number(s.price) || 0,
            duration_mins: s.duration_mins,
            primary_staff_id: targetItem.primary_staff_id,
            staff_splits: targetItem.staff_splits,
          };
        })
        .filter(Boolean) as any[];
    }

    const updatedServices = services.map((svc) => ({
      ...svc,
      guest_name: guestProfile.name.trim(),
      guest_gender: guestProfile.gender !== "unspecified" ? guestProfile.gender : undefined,
      guest_phone: guestProfile.phone?.trim() || undefined,
    }));

    updateDraftItem(itemId, {
      guest_name: guestProfile.name.trim(),
      guest_gender: guestProfile.gender !== "unspecified" ? guestProfile.gender : undefined,
      guest_phone: guestProfile.phone?.trim() || undefined,
      package_services: updatedServices,
    });
  };

  const handleOpenPersonSelector = (item: InvoiceItem) => {
    if (openGuestItemId === item.id) {
      setOpenGuestItemId(null);
    } else {
      setOpenGuestItemId(item.id);
      setGuestFormName(item.guest_name || "");
      setGuestFormGender(item.guest_gender || "unspecified");
      setGuestFormPhone(item.guest_phone || "");
    }
  };

  const handleOpenSubServicePersonSelector = (itemId: string, svc: PackageServiceItem) => {
    const key = `${itemId}_${svc.service_id}`;
    if (openGuestItemId === key) {
      setOpenGuestItemId(null);
    } else {
      setOpenGuestItemId(key);
      setGuestFormName(svc.guest_name || "");
      setGuestFormGender(svc.guest_gender || "unspecified");
      setGuestFormPhone(svc.guest_phone || "");
    }
  };

  const handleSaveGuestProfile = (itemId: string) => {
    const item = draftItems.find((i) => i.id === itemId);
    const isPkg = item?.item_type === "package";

    if (!guestFormName.trim()) {
      if (isPkg) {
        handleClearPerson(itemId);
      } else {
        updateDraftItem(itemId, {
          guest_name: undefined,
          guest_gender: undefined,
          guest_phone: undefined,
        });
      }
    } else {
      if (isPkg) {
        // Automatically updates all services inside this package combo
        handleAssignAllPackageGuests(itemId, {
          name: guestFormName.trim(),
          gender: guestFormGender !== "unspecified" ? guestFormGender : undefined,
          phone: guestFormPhone.trim() || undefined,
        });
      } else {
        updateDraftItem(itemId, {
          guest_name: guestFormName.trim(),
          guest_gender: guestFormGender !== "unspecified" ? guestFormGender : undefined,
          guest_phone: guestFormPhone.trim() || undefined,
        });
      }
    }
    setOpenGuestItemId(null);
  };

  const handleSaveSubServiceGuestProfile = (itemId: string, serviceId: string) => {
    handlePackageServiceGuestChange(itemId, serviceId, {
      name: guestFormName.trim() || undefined,
      gender: guestFormGender,
      phone: guestFormPhone,
    });
    setOpenGuestItemId(null);
  };

  const handleQuickSelectGuest = (itemId: string, profile: KnownGuestProfile) => {
    const item = draftItems.find((i) => i.id === itemId);
    if (item?.item_type === "package") {
      // Automatically updates all services inside this package combo
      handleAssignAllPackageGuests(itemId, {
        name: profile.name,
        gender: profile.gender,
        phone: profile.phone,
      });
    } else {
      updateDraftItem(itemId, {
        guest_name: profile.name,
        guest_gender: profile.gender !== "unspecified" ? profile.gender : undefined,
        guest_phone: profile.phone || undefined,
      });
    }
    setOpenGuestItemId(null);
  };

  const handleQuickSelectSubServiceGuest = (itemId: string, serviceId: string, profile: KnownGuestProfile) => {
    handlePackageServiceGuestChange(itemId, serviceId, {
      name: profile.name,
      gender: profile.gender,
      phone: profile.phone,
    });
    setOpenGuestItemId(null);
  };

  const handleClearPerson = (itemId: string) => {
    const item = draftItems.find((i) => i.id === itemId);
    if (item?.item_type === "package") {
      let services = item.package_services || [];
      const clearedServices = services.map((svc) => ({
        ...svc,
        guest_name: undefined,
        guest_gender: undefined,
        guest_phone: undefined,
      }));
      updateDraftItem(itemId, {
        guest_name: undefined,
        guest_gender: undefined,
        guest_phone: undefined,
        package_services: clearedServices,
      });
    } else {
      updateDraftItem(itemId, {
        guest_name: undefined,
        guest_gender: undefined,
        guest_phone: undefined,
      });
    }
    setOpenGuestItemId(null);
  };

  const handleClearSubServicePerson = (itemId: string, serviceId: string) => {
    handlePackageServiceGuestChange(itemId, serviceId, undefined);
    setOpenGuestItemId(null);
  };

  const handleApplyGuestToAll = (name: string, gender?: "female" | "male" | "other" | "unspecified", phone?: string) => {
    if (!name.trim()) return;
    draftItems.forEach((it) => {
      if (it.item_type === "package") {
        handleAssignAllPackageGuests(it.id, {
          name: name.trim(),
          gender,
          phone,
        });
      } else {
        updateDraftItem(it.id, {
          guest_name: name.trim(),
          guest_gender: gender !== "unspecified" ? gender : undefined,
          guest_phone: phone?.trim() || undefined,
        });
      }
    });
    setOpenGuestItemId(null);
  };

  const handleOpenSplit = (item: InvoiceItem) => {
    setActiveSplitItem(item);
    setIsSplitModalOpen(true);
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
      const packageCatalogItem = catalog.find((c) => c.id === targetItem.item_id);
      const serviceIds =
        targetItem.package_service_ids || packageCatalogItem?.package_service_ids || [];
      services = serviceIds
        .map((sId) => {
          const s = catalog.find((c) => c.id === sId);
          if (!s) return null;
          return {
            service_id: s.id,
            service_name: s.name,
            price: Number(s.price) || 0,
            regular_price: Number(s.price) || 0,
            duration_mins: s.duration_mins,
            primary_staff_id: targetItem.primary_staff_id,
            staff_splits: targetItem.staff_splits,
          };
        })
        .filter(Boolean) as any[];
    }

    const updatedServices = services.map((svc) =>
      svc.service_id === serviceId ? { ...svc, price: Math.max(0, newPrice) } : svc
    );

    const calculatedNewPackageTotal = updatedServices.reduce((sum, s) => sum + (s.price || 0), 0);

    updateDraftItem(itemId, {
      package_services: updatedServices,
      unit_price: calculatedNewPackageTotal,
    });
  };

  // PACKAGE SERVICE HANDLERS: ASSIGN INDIVIDUAL SERVICE STYLIST
  const handlePackageServiceStaffChange = (
    itemId: string,
    serviceId: string,
    staffId: string
  ) => {
    const targetItem = draftItems.find((i) => i.id === itemId);
    if (!targetItem) return;

    let services = targetItem.package_services;
    if (!services || services.length === 0) {
      const packageCatalogItem = catalog.find((c) => c.id === targetItem.item_id);
      const serviceIds =
        targetItem.package_service_ids || packageCatalogItem?.package_service_ids || [];
      services = serviceIds
        .map((sId) => {
          const s = catalog.find((c) => c.id === sId);
          if (!s) return null;
          return {
            service_id: s.id,
            service_name: s.name,
            price: Number(s.price) || 0,
            regular_price: Number(s.price) || 0,
            duration_mins: s.duration_mins,
            primary_staff_id: targetItem.primary_staff_id,
            staff_splits: targetItem.staff_splits,
          };
        })
        .filter(Boolean) as any[];
    }

    const updatedServices = services.map((svc) => {
      if (svc.service_id === serviceId) {
        const primary_staff_id = staffId || undefined;
        const staff_splits = primary_staff_id
          ? [{ staff_id: primary_staff_id, amount: svc.price, ratio: 100 }]
          : undefined;
        return { ...svc, primary_staff_id, staff_splits };
      }
      return svc;
    });

    updateDraftItem(itemId, {
      package_services: updatedServices,
    });
  };

  // PACKAGE SERVICE HANDLER: ASSIGN PERSON TO INDIVIDUAL SERVICE INSIDE PACKAGE
  const handlePackageServiceGuestChange = (
    itemId: string,
    serviceId: string,
    guestProfile?: { name?: string; gender?: "female" | "male" | "other" | "unspecified"; phone?: string }
  ) => {
    const targetItem = draftItems.find((i) => i.id === itemId);
    if (!targetItem) return;

    let services = targetItem.package_services;
    if (!services || services.length === 0) {
      const packageCatalogItem = catalog.find((c) => c.id === targetItem.item_id);
      const serviceIds =
        targetItem.package_service_ids || packageCatalogItem?.package_service_ids || [];
      services = serviceIds
        .map((sId) => {
          const s = catalog.find((c) => c.id === sId);
          if (!s) return null;
          return {
            service_id: s.id,
            service_name: s.name,
            price: Number(s.price) || 0,
            regular_price: Number(s.price) || 0,
            duration_mins: s.duration_mins,
            primary_staff_id: targetItem.primary_staff_id,
            staff_splits: targetItem.staff_splits,
          };
        })
        .filter(Boolean) as any[];
    }

    const updatedServices = services.map((svc) => {
      if (svc.service_id === serviceId) {
        return {
          ...svc,
          guest_name: guestProfile?.name ? guestProfile.name.trim() : undefined,
          guest_gender: guestProfile?.gender !== "unspecified" ? guestProfile?.gender : undefined,
          guest_phone: guestProfile?.phone?.trim() || undefined,
        };
      }
      return svc;
    });

    updateDraftItem(itemId, {
      package_services: updatedServices,
    });
  };

  // QUICK ASSIGN ALL SUB-SERVICES IN A PACKAGE TO ONE STYLIST
  const handleAssignAllPackageServices = (itemId: string, staffId: string) => {
    const targetItem = draftItems.find((i) => i.id === itemId);
    if (!targetItem) return;

    let services = targetItem.package_services;
    if (!services || services.length === 0) {
      const packageCatalogItem = catalog.find((c) => c.id === targetItem.item_id);
      const serviceIds =
        targetItem.package_service_ids || packageCatalogItem?.package_service_ids || [];
      services = serviceIds
        .map((sId) => {
          const s = catalog.find((c) => c.id === sId);
          if (!s) return null;
          return {
            service_id: s.id,
            service_name: s.name,
            price: Number(s.price) || 0,
            regular_price: Number(s.price) || 0,
            duration_mins: s.duration_mins,
          };
        })
        .filter(Boolean) as any[];
    }

    const updatedServices = services.map((svc) => ({
      ...svc,
      primary_staff_id: staffId || undefined,
      staff_splits: staffId ? [{ staff_id: staffId, amount: svc.price, ratio: 100 }] : undefined,
    }));

    updateDraftItem(itemId, {
      primary_staff_id: staffId || undefined,
      package_services: updatedServices,
    });
  };

  if (draftItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-800/60">
        <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3 shadow-inner">
          <Scissors className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-300">Cart is Empty</h4>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">
          Select services, packages, or retail products from the catalog to start building this invoice.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* MULTI-PERSON BILL SUMMARY BANNER (Shown when 2+ guests are tagged) */}
      {multiGuestSummary.length > 1 && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-indigo-950/40 to-purple-950/60 border border-cyan-700/60 shadow-lg shadow-cyan-950/30 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              Multi-Person Bill Summary ({multiGuestSummary.length} Persons)
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Itemized per person on receipt & WhatsApp
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {multiGuestSummary.map((g) => (
              <div
                key={g.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-cyan-800/60 shadow-sm"
              >
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  <User className="h-3 w-3 text-cyan-400" />
                  {g.name}:
                </span>
                <span className="font-mono text-xs font-extrabold text-emerald-400">
                  {formatCurrency(g.total, settings.currency_symbol)}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">
                  ({g.count} item{g.count > 1 ? "s" : ""})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        const isPersonOpen = openGuestItemId === item.id;

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
            {/* ROW 1: ITEM NAME, BADGE, PERSON BADGE, AND LINE TOTAL */}
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

                  {/* ACTIVE PERSON TAG BADGE */}
                  {item.guest_name && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 shadow-sm">
                      <User className="h-2.5 w-2.5 text-cyan-400" />
                      <span>{item.guest_name}</span>
                      {item.guest_gender && item.guest_gender !== "unspecified" && (
                        <span className="text-[9px] text-cyan-400/80 uppercase">
                          ({item.guest_gender === "female" ? "F" : item.guest_gender === "male" ? "M" : "O"})
                        </span>
                      )}
                      {item.guest_phone && (
                        <span className="text-[9px] text-zinc-400 font-mono">
                          • {item.guest_phone.slice(-4)}
                        </span>
                      )}
                    </span>
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
                    className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-zinc-200 font-mono">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDraftItem(item.id, { quantity: item.quantity + 1 })}
                    className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
                    value={item.discount === 0 ? "" : item.discount}
                    onChange={(e) =>
                      updateDraftItem(item.id, { discount: e.target.value === "" ? 0 : Number(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full h-7 pl-5 pr-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-rose-300 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    title="Item specific discount"
                  />
                </div>
              </div>
            </div>

            {/* ===================================================================
                PACKAGE SPECIAL: PER-SERVICE STYLIST SELECTION & CUSTOM AMOUNT & PERSON
                =================================================================== */}
            {isPackage ? (
              <div className="mt-3 pt-3 border-t border-purple-900/40 space-y-2.5">
                {/* PACKAGE TOOLBAR: QUICK ASSIGN ALL */}
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-purple-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-pink-300 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-pink-400" />
                      Included Services ({packageServices.length || 0}):
                    </span>
                  </div>

                  {/* 2-COLUMN GRID (50% STYLIST, 50% PERSON) */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* QUICK ASSIGN ALL STYLIST */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-400 block truncate">
                        ⚡ All Stylist:
                      </span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignAllPackageServices(item.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                        className="w-full h-7 px-2 text-[10px] bg-zinc-900 border border-purple-800/60 rounded-lg text-purple-300 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 truncate"
                      >
                        <option value="" disabled>
                          ⚡ Assign All
                        </option>
                        {staff
                          .filter((s) => s.status === "active" || s.status === "half_day")
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.role}){s.status === "half_day" ? " [Half Day]" : ""}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* ASSIGN PACKAGE COMBO PERSON */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-cyan-400 block truncate">
                        👤 All Person:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenPersonSelector(item)}
                        className={`w-full h-7 px-2 text-[10px] rounded-lg font-bold flex items-center justify-between border transition-all ${
                          item.guest_name
                            ? "bg-cyan-950/80 border-cyan-500/70 text-cyan-200 shadow-sm"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-cyan-500/60 hover:text-cyan-300"
                        }`}
                        title="Assign package person (auto-fills all included services)"
                      >
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          <User className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{item.guest_name ? item.guest_name : "+ Person"}</span>
                        </div>
                        <ChevronDown className="h-2.5 w-2.5 text-cyan-400/70 shrink-0 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* EXPANDED PACKAGE-LEVEL PERSON FORM */}
                {isPersonOpen && (
                  <div className="p-3.5 rounded-2xl border border-cyan-700/70 bg-zinc-950/95 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                      <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-cyan-400" />
                        Assign Package Person (Auto-fills all included services):
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenGuestItemId(null)}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* QUICK SELECT CHIPS */}
                    {knownGuests.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-zinc-400 block">
                          Quick Select from Bill:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {knownGuests.map((g) => {
                            const isSelected =
                              (item.guest_name || "").toLowerCase() === g.name.toLowerCase();
                            return (
                              <button
                                key={g.name}
                                type="button"
                                onClick={() => handleQuickSelectGuest(item.id, g)}
                                className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-sm"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                }`}
                              >
                                <span>👤 {g.name}</span>
                                {g.phone && (
                                  <span className="text-[10px] text-zinc-400 font-mono font-normal">
                                    ({g.phone.slice(-4)})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DETAILED FORM: NAME + OPTIONAL GENDER + OPTIONAL NUMBER */}
                    <div className="pt-2 border-t border-zinc-900 space-y-2.5">
                      <span className="text-[10px] font-semibold text-zinc-400 block">
                        Or Add / Edit Companion Details:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* NAME */}
                        <div>
                          <label className="text-[9.5px] font-bold text-zinc-400 block mb-1">
                            Person Name *
                          </label>
                          <input
                            type="text"
                            value={guestFormName}
                            onChange={(e) => setGuestFormName(e.target.value)}
                            placeholder="e.g. Sam, Ram, Friend"
                            className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-medium"
                          />
                        </div>

                        {/* GENDER (OPTIONAL) */}
                        <div>
                          <label className="text-[9.5px] font-bold text-zinc-400 block mb-1">
                            Gender (Optional)
                          </label>
                          <select
                            value={guestFormGender}
                            onChange={(e) => setGuestFormGender(e.target.value as any)}
                            className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-cyan-500 font-medium"
                          >
                            <option value="unspecified">-- Optional --</option>
                            <option value="female">Female 👩</option>
                            <option value="male">Male 👨</option>
                            <option value="other">Other 🧑</option>
                          </select>
                        </div>

                        {/* MOBILE NUMBER (OPTIONAL) */}
                        <div>
                          <label className="text-[9.5px] font-bold text-zinc-400 block mb-1">
                            Mobile No. (Optional)
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            value={guestFormPhone}
                            onChange={(e) =>
                              setGuestFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                            }
                            placeholder="10-digit mobile"
                            className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!guestFormName.trim()}
                            onClick={() => handleSaveGuestProfile(item.id)}
                            className="h-7 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Set Person
                          </button>
                          {item.guest_name && (
                            <button
                              type="button"
                              onClick={() => handleClearPerson(item.id)}
                              className="h-7 px-2.5 rounded-xl text-rose-400 hover:text-rose-300 text-xs font-medium"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenGuestItemId(null)}
                            className="h-7 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INDIVIDUAL SERVICES IN PACKAGE */}
                <div className="space-y-2 bg-zinc-950/70 p-2.5 rounded-xl border border-purple-900/30">
                  {packageServices.map((svc, sIdx) => {
                    const isSvcUnassigned = !svc.primary_staff_id;
                    const assignedStaff = staff.find((s) => s.id === svc.primary_staff_id);
                    const subKey = `${item.id}_${svc.service_id}`;
                    const isSubPersonOpen = openGuestItemId === subKey;

                    return (
                      <div
                        key={svc.service_id || sIdx}
                        className={`p-2.5 rounded-xl border space-y-2 transition-all ${
                          isSvcUnassigned
                            ? "bg-amber-950/20 border-amber-500/40"
                            : "bg-zinc-900/90 border-zinc-800/80"
                        }`}
                      >
                        {/* ROW 1: SERVICE TITLE & PRICE */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Scissors className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                            <span className="text-xs font-bold text-zinc-100 truncate" title={svc.service_name}>
                              {svc.service_name}
                            </span>
                            {svc.guest_name && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 shrink-0">
                                👤 {svc.guest_name}
                              </span>
                            )}
                          </div>

                          {/* EDITABLE SERVICE PRICE */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-zinc-400 font-semibold">₹:</span>
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
                              className="w-16 h-6 px-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-zinc-950 border border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              title="Customise billed amount for this service inside the package"
                            />
                          </div>
                        </div>

                        {/* ROW 2: STYLIST SELECTOR & PERSON BUTTON (2-COLUMN GRID) */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-zinc-950">
                          {/* PER-SERVICE STYLIST SELECTOR */}
                          <select
                            value={svc.primary_staff_id || ""}
                            onChange={(e) =>
                              handlePackageServiceStaffChange(
                                item.id,
                                svc.service_id,
                                e.target.value
                              )
                            }
                            className={`w-full h-7 px-2 text-[10px] rounded-lg font-medium transition-all focus:outline-none focus:ring-1 truncate ${
                              isSvcUnassigned
                                ? "bg-amber-950/60 border border-amber-500 text-amber-200 focus:ring-amber-500"
                                : "bg-zinc-950 border border-zinc-800 text-zinc-200 focus:ring-purple-500"
                            }`}
                          >
                            <option value="">-- Stylist * --</option>
                            {staff.map((s) => (
                              <option
                                key={s.id}
                                value={s.id}
                                disabled={s.status === "on_leave" || s.status === "weekly_off" || s.status === "inactive"}
                              >
                                {s.name} ({s.role}){s.status === "half_day" ? " [Half Day]" : s.status === "on_leave" ? " [On Leave]" : s.status === "weekly_off" ? " [Off]" : ""}
                              </option>
                            ))}
                          </select>

                          {/* PER-SERVICE PERSON BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleOpenSubServicePersonSelector(item.id, svc)}
                            className={`w-full h-7 px-2 text-[10px] rounded-lg font-bold flex items-center justify-between border transition-all ${
                              svc.guest_name
                                ? "bg-cyan-950/90 border-cyan-500 text-cyan-200 shadow-sm"
                                : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-cyan-500/60 hover:text-cyan-300"
                            }`}
                            title="Assign this specific service to a companion/person"
                          >
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <User className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                              <span className="truncate">{svc.guest_name ? svc.guest_name : "+ Person"}</span>
                            </div>
                            <ChevronDown className="h-2.5 w-2.5 text-cyan-400/70 shrink-0 ml-1" />
                          </button>
                        </div>

                        {/* EXPANDED SUB-SERVICE PERSON FORM */}
                        {isSubPersonOpen && (
                          <div className="p-3 rounded-xl border border-cyan-700/70 bg-zinc-950 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                              <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                                <User className="h-3 w-3 text-cyan-400" />
                                Assign &quot;{svc.service_name}&quot; to Person:
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpenGuestItemId(null)}
                                className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>

                            {/* QUICK SELECT CHIPS */}
                            {knownGuests.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-semibold text-zinc-400 block">
                                  Quick Select from Bill:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {knownGuests.map((g) => (
                                    <button
                                      key={g.name}
                                      type="button"
                                      onClick={() => handleQuickSelectSubServiceGuest(item.id, svc.service_id, g)}
                                      className="text-[10px] px-2 py-0.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white font-semibold"
                                    >
                                      👤 {g.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* INLINE FORM */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 border-t border-zinc-900">
                              <input
                                type="text"
                                value={guestFormName}
                                onChange={(e) => setGuestFormName(e.target.value)}
                                placeholder="Person Name *"
                                className="h-7 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                              />
                              <select
                                value={guestFormGender}
                                onChange={(e) => setGuestFormGender(e.target.value as any)}
                                className="h-7 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200"
                              >
                                <option value="unspecified">-- Gender (Optional) --</option>
                                <option value="female">Female 👩</option>
                                <option value="male">Male 👨</option>
                                <option value="other">Other 🧑</option>
                              </select>
                              <input
                                type="tel"
                                maxLength={10}
                                value={guestFormPhone}
                                onChange={(e) => setGuestFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="Mobile (Optional)"
                                className="h-7 px-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono placeholder:text-zinc-600"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1 gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={!guestFormName.trim()}
                                  onClick={() => handleSaveSubServiceGuestProfile(item.id, svc.service_id)}
                                  className="h-6 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-[10px] font-bold text-white flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  Save
                                </button>
                                {svc.guest_name && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearSubServicePerson(item.id, svc.service_id)}
                                    className="h-6 px-2 rounded-lg text-rose-400 hover:text-rose-300 text-[10px] font-medium"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setOpenGuestItemId(null)}
                                className="h-6 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
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
              <div className="mt-3 pt-3 border-t border-zinc-900/80 space-y-2.5">
                {/* 1. STYLIST SELECTOR ROW */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                    <User className={`h-3 w-3 ${isStylistMissing ? "text-amber-400" : "text-purple-400"}`} />
                    {isService ? "Assigned Stylist *" : "Staff (Optional)"}
                  </span>

                  {item.staff_splits && item.staff_splits.length > 1 ? (
                    /* MULTI-STAFF SPLIT DISPLAY */
                    <button
                      type="button"
                      onClick={() => handleOpenSplit(item)}
                      className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold bg-purple-950/70 border-purple-600/80 text-purple-200 shadow-sm hover:bg-purple-900/70 transition-all cursor-pointer text-left"
                      title="Click to modify staff split amounts"
                    >
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <Users className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span className="font-bold shrink-0">Split ({item.staff_splits.length}):</span>
                        <span className="font-mono text-zinc-300 truncate">
                          {item.staff_splits
                            .map((s) => {
                              const st = staff.find((staffMember) => staffMember.id === s.staff_id);
                              return `${st?.name || "Staff"} (₹${s.amount})`;
                            })
                            .join(" + ")}
                        </span>
                      </span>
                    </button>
                  ) : (
                    /* SINGLE STYLIST DROPDOWN WITH SPLIT BUTTON */
                    <div className="flex items-center gap-1.5 w-full">
                      <select
                        value={item.primary_staff_id || ""}
                        onChange={(e) => {
                          const newStaffId = e.target.value || undefined;
                          const currentTotal = item.total_price || (item.unit_price * item.quantity);
                          updateDraftItem(item.id, {
                            primary_staff_id: newStaffId,
                            staff_splits: newStaffId
                              ? [{ staff_id: newStaffId, amount: currentTotal, ratio: 100 }]
                              : undefined,
                          });
                        }}
                        className={`h-8 px-2.5 text-xs rounded-xl font-medium flex-1 min-w-0 transition-all focus:outline-none focus:ring-1 truncate ${
                          isStylistMissing
                            ? "bg-amber-950/40 border border-amber-500/70 text-amber-200 focus:ring-amber-500 font-bold"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-200 focus:ring-purple-500"
                        }`}
                      >
                        <option value="">
                          {isService ? "-- Select Stylist * --" : "-- Assign Staff (Optional) --"}
                        </option>
                        {staff.map((s) => (
                          <option
                            key={s.id}
                            value={s.id}
                            disabled={s.status === "on_leave" || s.status === "weekly_off" || s.status === "inactive"}
                          >
                            {s.name} ({s.role}){s.status === "half_day" ? " [Half Day]" : s.status === "on_leave" ? " [On Leave]" : s.status === "weekly_off" ? " [Off]" : ""}
                          </option>
                        ))}
                      </select>

                      {/* SPLIT BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleOpenSplit(item)}
                        className="h-8 px-2.5 rounded-xl border text-[11px] font-semibold transition-all bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-purple-300 hover:text-white shrink-0 flex items-center gap-1"
                        title="Split commission between multiple staff"
                      >
                        <Users className="h-3 w-3" />
                        <span>Split</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. PERSON / COMPANION SELECTOR ROW */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                      <UserPlus className="h-3 w-3 text-cyan-400" />
                      Person / Guest
                    </span>
                    {item.guest_name && (
                      <button
                        type="button"
                        onClick={() => handleClearPerson(item.id)}
                        className="text-[9.5px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
                      >
                        Clear Person
                      </button>
                    )}
                  </div>

                  {/* PERSON BUTTON TRIGGER */}
                  <button
                    type="button"
                    onClick={() => handleOpenPersonSelector(item)}
                    className={`w-full h-8 px-2.5 text-xs rounded-xl font-semibold flex items-center justify-between transition-all border ${
                      item.guest_name
                        ? "bg-cyan-950/70 border-cyan-500/80 text-cyan-200 shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <User className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        {item.guest_name ? (
                          <>
                            <strong className="text-white">{item.guest_name}</strong>
                            {item.guest_gender && item.guest_gender !== "unspecified" && (
                              <span className="text-[10px] text-cyan-300/80 ml-1 font-normal uppercase">
                                ({item.guest_gender === "female" ? "F" : item.guest_gender === "male" ? "M" : "O"})
                              </span>
                            )}
                            {item.guest_phone && (
                              <span className="text-[10px] text-zinc-400 ml-1 font-mono font-normal">
                                • {item.guest_phone}
                              </span>
                            )}
                          </>
                        ) : (
                          "+ Select / Add Person"
                        )}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-cyan-400 shrink-0 ml-1 transition-transform ${
                        isPersonOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* EXPANDED PERSON FORM (MOBILE & DESKTOP ACCESSIBLE) */}
                {isPersonOpen && (
                  <div className="p-3.5 rounded-2xl border border-cyan-700/70 bg-zinc-950/95 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                      <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-cyan-400" />
                        Assign Service to Person:
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenGuestItemId(null)}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* QUICK SELECT CHIPS */}
                    {knownGuests.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-zinc-400 block">
                          Quick Select from Bill:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {knownGuests.map((g) => {
                            const isSelected =
                              (item.guest_name || "").toLowerCase() === g.name.toLowerCase();
                            return (
                              <button
                                key={g.name}
                                type="button"
                                onClick={() => handleQuickSelectGuest(item.id, g)}
                                className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-sm"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                }`}
                              >
                                <span>👤 {g.name}</span>
                                {g.phone && (
                                  <span className="text-[10px] text-zinc-400 font-mono font-normal">
                                    ({g.phone.slice(-4)})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DETAILED FORM: NAME + OPTIONAL GENDER + OPTIONAL NUMBER */}
                    <div className="pt-2 border-t border-zinc-900 space-y-2.5">
                      <span className="text-[10px] font-semibold text-zinc-400 block">
                        Or Add / Edit Companion Details:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* NAME */}
                        <div>
                          <label className="text-[9.5px] font-bold text-zinc-400 block mb-1">
                            Person Name *
                          </label>
                          <input
                            type="text"
                            value={guestFormName}
                            onChange={(e) => setGuestFormName(e.target.value)}
                            placeholder="e.g. Sam, Ram, Friend"
                            className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-medium"
                          />
                        </div>

                        {/* GENDER (OPTIONAL) */}
                        <div>
                          <label className="text-[9.5px] font-bold text-zinc-400 block mb-1">
                            Gender (Optional)
                          </label>
                          <select
                            value={guestFormGender}
                            onChange={(e) => setGuestFormGender(e.target.value as any)}
                            className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-cyan-500 font-medium"
                          >
                            <option value="unspecified">-- Optional --</option>
                            <option value="female">Female 👩</option>
                            <option value="male">Male 👨</option>
                            <option value="other">Other 🧑</option>
                          </select>
                        </div>

                        {/* MOBILE NUMBER (OPTIONAL) */}
                        <div>
                          <label className="text-[9.5px] font-bold text-zinc-400 block mb-1">
                            Mobile No. (Optional)
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            value={guestFormPhone}
                            onChange={(e) =>
                              setGuestFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                            }
                            placeholder="10-digit mobile"
                            className="w-full h-8 px-2.5 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!guestFormName.trim()}
                            onClick={() => handleSaveGuestProfile(item.id)}
                            className="h-7 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Set Person
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenGuestItemId(null)}
                            className="h-7 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>

                        {guestFormName.trim() && (
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyGuestToAll(
                                guestFormName.trim(),
                                guestFormGender,
                                guestFormPhone
                              )
                            }
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                          >
                            ⚡ Apply &quot;{guestFormName.trim()}&quot; to all services
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* BOTTOM ACTION BAR: REMOVE SERVICE BUTTON */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => removeDraftItem(item.id)}
                    className="px-2 py-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors flex items-center gap-1 text-[11px]"
                    title="Remove item from cart"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Item</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

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
