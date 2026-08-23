"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Customer } from "@/types";
import {
  User,
  Phone,
  Mail,
  Gift,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  UserCheck,
  X,
  Plus,
  CheckCircle2,
  FileEdit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, generateUUID } from "@/lib/utils";

export function CustomerSelector() {
  const { customers, invoices, draftCustomer, setDraftCustomer, settings, saveCustomer } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAddingDetails, setIsAddingDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // UNIFY REGISTERED CUSTOMERS + INVOICE CUSTOMER RECORDS
  const allAvailableCustomers = useMemo(() => {
    const map = new Map<string, Customer>();

    // 1. Add all registered customers
    customers.forEach((cust) => {
      const cleanPhone = cust.phone ? cust.phone.replace(/\D/g, "").trim() : "";
      const cleanName = (cust.name || "").toLowerCase().trim();
      const key = cleanPhone || cleanName;
      if (key) {
        map.set(key, { ...cust });
      }
    });

    // 2. Scan all invoices to discover customer records
    invoices.forEach((inv) => {
      if (inv.status === "void") return;
      const rawName = inv.customer_name?.trim() || "";
      const isAnonymous = !rawName || rawName.toLowerCase() === "walk-in guest";
      const cleanPhone = inv.customer_phone ? inv.customer_phone.replace(/\D/g, "").trim() : "";

      if (!isAnonymous || cleanPhone) {
        const key = cleanPhone || rawName.toLowerCase();
        if (!key) return;

        const existing = map.get(key);
        if (existing) {
          if (inv.created_at && (!existing.last_visit || new Date(inv.created_at) > new Date(existing.last_visit))) {
            existing.last_visit = inv.created_at;
          }
          if (!existing.email && inv.customer_email) existing.email = inv.customer_email;
          if (!existing.phone && inv.customer_phone) existing.phone = inv.customer_phone;
        } else {
          map.set(key, {
            id: inv.customer_id || generateUUID(),
            name: rawName || (cleanPhone ? `Guest (${cleanPhone})` : "Guest"),
            phone: inv.customer_phone || "",
            email: inv.customer_email || undefined,
            gender: "female",
            total_visits: 0,
            total_spent: 0,
            last_visit: inv.created_at,
            created_at: inv.created_at || new Date().toISOString(),
          });
        }
      }
    });

    // 3. Compute accurate visit counts and spend from real invoices
    return Array.from(map.values()).map((cust) => {
      const cleanPhone = cust.phone ? cust.phone.replace(/\D/g, "").trim() : "";
      const custName = (cust.name || "").toLowerCase().trim();

      const custInvoices = invoices.filter((inv) => {
        if (inv.status === "void") return false;
        const invPhone = inv.customer_phone ? inv.customer_phone.replace(/\D/g, "").trim() : "";
        const invName = (inv.customer_name || "").toLowerCase().trim();

        if (cleanPhone && invPhone) return cleanPhone === invPhone;
        if (cust.id && inv.customer_id) return cust.id === inv.customer_id;
        return custName && custName === invName && custName !== "walk-in guest";
      });

      return {
        ...cust,
        total_visits: Math.max(cust.total_visits || 0, custInvoices.length),
        total_spent: Math.max(
          cust.total_spent || 0,
          custInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0)
        ),
      };
    });
  }, [customers, invoices]);

  // Filter customers by name or phone number across all sources
  const filteredCustomers = useMemo(() => {
    const rawQ = searchQuery.trim().toLowerCase();
    if (!rawQ) return [];
    const digitsOnly = rawQ.replace(/\D/g, "");

    return allAvailableCustomers.filter((c: Customer) => {
      const custName = (c.name || "").toLowerCase().trim();
      const custPhone = (c.phone || "").replace(/\D/g, "");

      // 1. Name Match: partial substring, starts-with, or word match
      const nameMatch = custName.length > 0 && (
        custName.includes(rawQ) ||
        custName.split(/\s+/).some((part) => part.startsWith(rawQ))
      );

      // 2. Phone Match: digits match or raw match
      const phoneMatch = Boolean(
        digitsOnly.length > 0 && custPhone.includes(digitsOnly)
      ) || (c.phone && c.phone.toLowerCase().includes(rawQ));

      // 3. Email Match
      const emailMatch = Boolean(c.email && c.email.toLowerCase().includes(rawQ));

      return nameMatch || phoneMatch || emailMatch;
    });
  }, [allAvailableCustomers, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    setDraftCustomer({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      gender: customer.gender && customer.gender !== "unspecified" ? customer.gender : "female",
      email: customer.email,
      birthday: customer.birthday,
      notes: customer.notes,
      total_visits: customer.total_visits,
      total_spent: customer.total_spent,
    });
    setIsAddingDetails(true);
    setSearchQuery("");
    setIsOpenDropdown(false);
  };

  const handleCreateNewCustomer = () => {
    const isPhone = /^\d+$/.test(searchQuery.trim());
    const digitsOnly = searchQuery.replace(/\D/g, "").slice(0, 10);
    const newCust: Partial<Customer> = {
      name: isPhone ? "" : searchQuery.trim(),
      phone: isPhone ? digitsOnly : "",
      gender: "female",
    };
    setDraftCustomer(newCust);
    setIsAddingDetails(true);
    setSearchQuery("");
    setIsOpenDropdown(false);
  };

  const handleFieldChange = (field: keyof Customer, value: string) => {
    let cleanValue = value;
    if (field === "phone") {
      // Allow only numbers and maximum 10 digits
      cleanValue = value.replace(/\D/g, "").slice(0, 10);
    }
    setIsAddingDetails(true);
    if (!draftCustomer) {
      setDraftCustomer({ [field]: cleanValue });
    } else {
      setDraftCustomer({ ...draftCustomer, [field]: cleanValue });
    }
  };

  const handleResetToWalkIn = () => {
    setDraftCustomer(null);
    setIsAddingDetails(false);
    setShowAdvanced(false);
    setSearchQuery("");
  };

  const matchedCustomer = useMemo(() => {
    if (!draftCustomer) return null;
    const cleanPhone = draftCustomer.phone ? draftCustomer.phone.replace(/\D/g, "").trim() : "";
    const cleanName = (draftCustomer.name || "").toLowerCase().trim();

    if (cleanPhone) {
      const byPhone = allAvailableCustomers.find(
        (c: Customer) => c.phone && c.phone.replace(/\D/g, "").trim() === cleanPhone
      );
      if (byPhone) return byPhone;
    }

    if (cleanName && cleanName !== "walk-in guest") {
      return (
        allAvailableCustomers.find(
          (c: Customer) => (c.name || "").toLowerCase().trim() === cleanName
        ) || null
      );
    }

    return null;
  }, [draftCustomer, allAvailableCustomers]);

  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const handleSaveCurrentCustomer = () => {
    if (!draftCustomer?.name?.trim()) {
      alert("Please enter Customer Name to save profile.");
      return;
    }
    const saved = saveCustomer({
      id: draftCustomer.id || generateUUID(),
      name: draftCustomer.name.trim(),
      phone: draftCustomer.phone || "",
      gender: draftCustomer.gender || "female",
      email: draftCustomer.email,
      birthday: draftCustomer.birthday,
      notes: draftCustomer.notes,
      total_visits: draftCustomer.total_visits || 0,
      total_spent: draftCustomer.total_spent || 0,
      created_at: draftCustomer.created_at || new Date().toISOString(),
    });
    setDraftCustomer(saved);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2000);
  };

  return (
    <>
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-3.5 sm:p-4 backdrop-blur-xl shadow-lg relative z-20 space-y-3">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  {draftCustomer?.name?.trim() ? draftCustomer.name : "Client Information"}
                </span>
                {matchedCustomer && matchedCustomer.total_visits > 5 && (
                  <Badge variant="purple" className="text-[10px] py-0 px-2">
                    <Sparkles className="h-2.5 w-2.5 text-amber-400 mr-0.5" /> VIP
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 block">
                {matchedCustomer
                  ? `Returning guest (${matchedCustomer.total_visits} visits • ${formatCurrency(matchedCustomer.total_spent, settings.currency_symbol)})`
                  : "Enter client name, phone & gender (or search existing client)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer py-1 px-1.5 rounded-lg active:bg-purple-950/40"
            >
              <span>{showAdvanced ? "Less Fields" : "+ More Fields"}</span>
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {draftCustomer && (draftCustomer.name || draftCustomer.phone) && (
              <button
                type="button"
                onClick={handleResetToWalkIn}
                className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Clear client details (Reset to Walk-in)"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* QUICK CLIENT SEARCH & AUTOCOMPLETE */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by client Name (e.g. Sriya) or 10-digit Phone..."
              value={searchQuery}
              autoComplete="off"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpenDropdown(true);
              }}
              onFocus={() => setIsOpenDropdown(true)}
              className="w-full h-10 sm:h-9 pl-9 pr-8 text-sm sm:text-xs bg-zinc-950/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsOpenDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* DROPDOWN RESULTS */}
          {isOpenDropdown && searchQuery.trim().length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-11 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-1.5 max-h-60 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust: Customer) => {
                  const isMatchByName = (cust.name || "").toLowerCase().includes(searchQuery.toLowerCase().trim());
                  const isMatchByPhone = (cust.phone || "").includes(searchQuery.replace(/\D/g, ""));

                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-800/90 cursor-pointer transition-colors active:bg-purple-950/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{cust.name}</span>
                            {cust.gender && (
                              <span className="text-[10px] text-zinc-400 capitalize">
                                ({cust.gender})
                              </span>
                            )}
                            {isMatchByName && !isMatchByPhone && (
                              <span className="text-[9px] bg-purple-950/80 text-purple-300 border border-purple-800/60 px-1.5 py-0.2 rounded">
                                Name
                              </span>
                            )}
                            {isMatchByPhone && (
                              <span className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                                Phone
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                            <Phone className="h-2.5 w-2.5" />
                            {cust.phone || "No phone"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">
                          {formatCurrency(cust.total_spent, settings.currency_symbol)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {cust.total_visits} visits
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  onClick={handleCreateNewCustomer}
                  className="p-3 text-center text-xs text-purple-300 hover:bg-zinc-800/80 rounded-lg cursor-pointer flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="h-4 w-4 text-purple-400" />
                  <span>Add new client with "{searchQuery}"</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ALWAYS-EXPANDED CORE FIELDS: NAME, MOBILE, AND MANDATORY GENDER */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* CUSTOMER NAME (5 COLS) */}
          <div className="sm:col-span-5">
            <label className="text-xs sm:text-[11px] font-medium text-zinc-400 mb-1 block">
              Customer Name <span className="text-rose-400 font-bold">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-3.5 sm:w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="e.g. Aditi Rao"
                value={draftCustomer?.name || ""}
                autoComplete="name"
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="w-full h-10 sm:h-9 pl-9 pr-3 text-sm sm:text-xs bg-zinc-950/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-medium"
              />
            </div>
          </div>

          {/* MOBILE NUMBER (4 COLS) */}
          <div className="sm:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs sm:text-[11px] font-medium text-zinc-400">
                Mobile (Optional)
              </label>
              {draftCustomer?.phone && (
                <span
                  className={`text-[10px] font-mono font-medium ${
                    draftCustomer.phone.length === 10
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {draftCustomer.phone.length}/10
                  {draftCustomer.phone.length === 10 ? " ✓" : ""}
                </span>
              )}
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-3.5 sm:w-3.5 text-zinc-500" />
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="10 Digits"
                value={draftCustomer?.phone || ""}
                autoComplete="tel"
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                className="w-full h-10 sm:h-9 pl-9 pr-3 text-sm sm:text-xs bg-zinc-950/90 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-mono font-medium"
              />
            </div>
          </div>

          {/* MANDATORY GENDER SELECTION (3 COLS) */}
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs sm:text-[11px] font-medium text-zinc-400">
                Gender <span className="text-rose-400 font-bold">*</span>
              </label>
              {!draftCustomer?.gender || draftCustomer.gender === "unspecified" ? (
                <span className="text-[10px] text-amber-400 font-bold animate-pulse">Required</span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-medium">✓ Set</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 bg-zinc-950/90 p-0.5 rounded-xl border border-zinc-800 h-10 sm:h-9 items-center">
              {[
                { id: "female", label: "Female", emoji: "👩" },
                { id: "male", label: "Male", emoji: "👨" },
                { id: "other", label: "Other", emoji: "⚧" },
              ].map((g) => {
                const isSelected = (draftCustomer?.gender || "female") === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleFieldChange("gender", g.id)}
                    className={`h-full flex items-center justify-center gap-1 rounded-lg text-xs sm:text-[11px] font-bold transition-all ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-sm font-black"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    }`}
                    title={`Select ${g.label}`}
                  >
                    <span>{g.emoji}</span>
                    <span className="hidden xl:inline text-[10px]">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* REPEAT CLIENT STATS SUMMARY BANNER */}
        {matchedCustomer && (
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/30 flex items-center justify-between text-xs sm:text-[11px]">
            <div className="flex items-center gap-1.5 text-purple-300">
              <UserCheck className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-purple-400 shrink-0" />
              <span>
                Returning client ({matchedCustomer.total_visits} visits)
              </span>
            </div>
            <div className="font-semibold text-emerald-400 font-mono">
              Spent: {formatCurrency(matchedCustomer.total_spent, settings.currency_symbol)}
            </div>
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE: EXPANDED ADVANCED FIELDS */}
        {showAdvanced && (
          <div className="pt-3 border-t border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-[10px] font-medium text-zinc-400 mb-1 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={draftCustomer?.email || ""}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    className="w-full h-9 pl-8 pr-2.5 text-sm sm:text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-[10px] font-medium text-zinc-400 mb-1 block">
                  Birthday
                </label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="date"
                    value={draftCustomer?.birthday || ""}
                    onChange={(e) => handleFieldChange("birthday", e.target.value)}
                    className="w-full h-9 pl-8 pr-2 text-sm sm:text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-[10px] font-medium text-zinc-400 mb-1 block">
                Preferences / Allergy Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Ammonia-free dye, strong scalp massage..."
                value={draftCustomer?.notes || ""}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                className="w-full h-9 px-3 text-sm sm:text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* DIRECT SAVE BUTTON */}
        <div className="pt-2 flex items-center justify-end border-t border-zinc-800/60">
          <button
            type="button"
            onClick={handleSaveCurrentCustomer}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{isSavedSuccess ? "✓ Profile Saved to DB" : "Save Client Details"}</span>
          </button>
        </div>
      </div>
    </>
  );
}
