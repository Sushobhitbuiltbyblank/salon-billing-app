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
  Sparkles,
  UserCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  Search,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, generateUUID } from "@/lib/utils";
import {
  unifyCustomerList,
  normalizePhoneNumber,
  normalizeCustomerName,
  isAnonymousCustomerName,
} from "@/lib/customerUtils";

export function CustomerSelector() {
  const { customers, invoices, draftCustomer, setDraftCustomer, settings, saveCustomer } = useApp();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAddingDetails, setIsAddingDetails] = useState(false);

  // SEARCH CLIENT STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // UNIFY REGISTERED CUSTOMERS + INVOICE CUSTOMER RECORDS
  const allAvailableCustomers = useMemo(() => {
    return unifyCustomerList(customers, invoices);
  }, [customers, invoices]);

  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // SEARCH RESULTS MATCHING NAME OR PHONE NUMBER
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const digitsOnly = q.replace(/\D/g, "");

    return allAvailableCustomers
      .filter((c: Customer) => {
        if (!c) return false;
        // Ignore anonymous "Walk-in Guest" from results unless explicitly searched
        const isAnon = isAnonymousCustomerName(c.name || "");
        if (isAnon && !q.includes("walk")) return false;

        // Match Name
        const nameMatch = c.name && c.name.toLowerCase().includes(q);

        // Match Phone (exact, formatted, or raw digits)
        const cleanP = normalizePhoneNumber(c.phone);
        const rawPhone = (c.phone || "").replace(/\D/g, "");
        const phoneMatch =
          (c.phone && c.phone.includes(q)) ||
          (digitsOnly && (cleanP.includes(digitsOnly) || rawPhone.includes(digitsOnly)));

        return Boolean(nameMatch || phoneMatch);
      })
      .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))
      .slice(0, 8); // Top 8 matches
  }, [searchQuery, allAvailableCustomers]);

  // SELECT CUSTOMER FROM SEARCH
  const handleSelectCustomer = (c: Customer) => {
    const cleanPhone = normalizePhoneNumber(c.phone) || c.phone || "";
    setDraftCustomer({
      id: c.id,
      name: c.name,
      phone: cleanPhone,
      gender: c.gender && c.gender !== "unspecified" ? c.gender : undefined,
      email: c.email || "",
      birthday: c.birthday || "",
      notes: c.notes || "",
      total_visits: c.total_visits || 1,
      total_spent: c.total_spent || 0,
      created_at: c.created_at,
    });
    setSearchQuery("");
    setIsSearchOpen(false);
    setIsAddingDetails(true);
  };

  // KEYBOARD NAVIGATION IN SEARCH RESULTS
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || searchResults.length === 0) {
      if (e.key === "ArrowDown" && searchResults.length > 0) {
        setIsSearchOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[highlightedIndex]) {
        handleSelectCustomer(searchResults[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
    }
  };

  const handleFieldChange = (field: keyof Customer, value: string) => {
    let cleanValue = value;
    if (field === "phone") {
      // Allow only numbers and maximum 10 digits
      cleanValue = value.replace(/\D/g, "").slice(0, 10);

      // AUTO-PREFILL IF PHONE NUMBER ALREADY EXISTS IN CRM
      if (cleanValue.length === 10 || cleanValue.length >= 7) {
        const matches = allAvailableCustomers.filter(
          (c: Customer) => normalizePhoneNumber(c.phone) === cleanValue
        );

        if (matches.length > 0) {
          // If draftCustomer already has an ID that matches one of the profiles, keep that profile
          const existing = draftCustomer?.id
            ? matches.find((c) => c.id === draftCustomer.id) || matches[0]
            : matches[0];

          const currentName = draftCustomer?.name?.trim() || "";
          const isCurrentAnon = isAnonymousCustomerName(currentName);
          const nameToSet =
            !currentName || isCurrentAnon
              ? existing.name
              : draftCustomer?.name || existing.name;

          setDraftCustomer({
            ...(draftCustomer || {}),
            id: existing.id,
            phone: cleanValue,
            name: nameToSet,
            gender:
              existing.gender && existing.gender !== "unspecified"
                ? existing.gender
                : draftCustomer?.gender,
            email: existing.email || draftCustomer?.email || "",
            birthday: existing.birthday || draftCustomer?.birthday || "",
            notes: existing.notes || draftCustomer?.notes || "",
            total_visits: existing.total_visits,
            total_spent: existing.total_spent,
          });
          setIsAddingDetails(true);
          return;
        }
      }
    }

    setIsAddingDetails(true);
    if (!draftCustomer) {
      setDraftCustomer({
        gender: field === "gender" ? (cleanValue as any) : undefined,
        [field]: cleanValue,
      });
    } else {
      setDraftCustomer({
        ...draftCustomer,
        gender: field === "gender" ? (cleanValue as any) : draftCustomer.gender,
        [field]: cleanValue,
      });
    }
  };

  const handleResetToWalkIn = () => {
    setDraftCustomer(null);
    setSearchQuery("");
    setIsSearchOpen(false);
    setIsAddingDetails(false);
    setShowAdvanced(false);
  };

  // All customer profiles matching the entered phone number (can be multiple)
  const matchingCustomersForPhone = useMemo(() => {
    if (!draftCustomer?.phone) return [];
    const cleanPhone = normalizePhoneNumber(draftCustomer.phone);
    if (cleanPhone.length < 7) return [];

    return allAvailableCustomers.filter(
      (c: Customer) => normalizePhoneNumber(c.phone) === cleanPhone
    );
  }, [draftCustomer?.phone, allAvailableCustomers]);

  // Specific customer record matched by the entered phone number
  const matchedCustomerByPhone = useMemo(() => {
    if (!draftCustomer?.phone) return null;
    const cleanPhone = normalizePhoneNumber(draftCustomer.phone);
    if (cleanPhone.length < 7) return null;

    if (draftCustomer.id) {
      const byId = allAvailableCustomers.find(
        (c: Customer) => c.id === draftCustomer.id && normalizePhoneNumber(c.phone) === cleanPhone
      );
      if (byId) return byId;
    }

    return (
      allAvailableCustomers.find(
        (c: Customer) => normalizePhoneNumber(c.phone) === cleanPhone
      ) || null
    );
  }, [draftCustomer?.phone, draftCustomer?.id, allAvailableCustomers]);

  // Detect if user has modified the registered name of this existing customer
  const isExistingNameEdited = useMemo(() => {
    if (!matchedCustomerByPhone || !matchedCustomerByPhone.name) return false;
    if (isAnonymousCustomerName(matchedCustomerByPhone.name)) return false;

    const currentDraftName = draftCustomer?.name?.trim() || "";
    if (!currentDraftName || isAnonymousCustomerName(currentDraftName)) return false;

    // If current name matches any registered customer with this phone number, it's not edited
    const matchesAny = matchingCustomersForPhone.some(
      (c) => normalizeCustomerName(c.name) === normalizeCustomerName(currentDraftName)
    );
    if (matchesAny) return false;

    return (
      normalizeCustomerName(currentDraftName) !==
      normalizeCustomerName(matchedCustomerByPhone.name)
    );
  }, [matchedCustomerByPhone, draftCustomer?.name, matchingCustomersForPhone]);

  const matchedCustomer = useMemo(() => {
    if (!draftCustomer) return null;

    // Prioritize matched ID if draftCustomer already has an ID
    if (draftCustomer.id) {
      const byId = allAvailableCustomers.find((c: Customer) => c.id === draftCustomer.id);
      if (byId) return byId;
    }

    const cleanPhone = normalizePhoneNumber(draftCustomer.phone);
    if (cleanPhone.length >= 7) {
      const byPhone = allAvailableCustomers.find(
        (c: Customer) => normalizePhoneNumber(c.phone) === cleanPhone
      );
      if (byPhone) return byPhone;
    }

    return null;
  }, [draftCustomer, allAvailableCustomers]);

  const hasNamedCustomer = useMemo(() => {
    return Boolean(
      draftCustomer?.name &&
      draftCustomer.name.trim() !== "" &&
      !isAnonymousCustomerName(draftCustomer.name)
    );
  }, [draftCustomer?.name]);

  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const handleSaveCurrentCustomer = async () => {
    if (!draftCustomer?.name?.trim()) {
      alert("Customer Name is required to save customer profile.");
      return;
    }
    const cleanPhone = normalizePhoneNumber(draftCustomer?.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("A valid 10-digit mobile number is required to save customer profile in CRM.");
      return;
    }
    if (!draftCustomer?.gender || draftCustomer.gender === "unspecified") {
      alert(
        "⚠️ Customer Gender Required\n\nPlease select the customer gender (👩 Female, 👨 Male, or ⚧ Other) before saving the client profile."
      );
      return;
    }
    const saved = await saveCustomer({
      id: draftCustomer.id || generateUUID(),
      name: draftCustomer.name.trim(),
      phone: cleanPhone,
      gender: draftCustomer.gender,
      email: draftCustomer.email?.trim() || undefined,
      birthday: draftCustomer.birthday?.trim() || undefined,
      notes: draftCustomer.notes?.trim() || undefined,
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
                  : "Search client by name or phone to auto-fill details, or enter new"}
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

            {draftCustomer &&
              (draftCustomer.name ||
                draftCustomer.phone ||
                (draftCustomer.gender && draftCustomer.gender !== "unspecified")) && (
              <button
                type="button"
                onClick={handleResetToWalkIn}
                className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs"
                title="Clear client details (Reset to Walk-in)"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline text-[11px]">Walk-in</span>
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            CLIENT SEARCH BAR (SEARCH BY NAME OR PHONE NUMBER)
            ===================================================================== */}
        <div className="relative" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-purple-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="🔍 Search client by name or number (e.g. Priya, 9810123456)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-10 pl-10 pr-9 text-xs sm:text-sm bg-zinc-950/90 border border-purple-500/30 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 font-medium transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* SEARCH SUGGESTIONS FLOATING DROPDOWN */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-zinc-950/95 border border-purple-500/40 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-zinc-800/80 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* RESULTS HEADER */}
              <div className="p-2.5 px-3 bg-zinc-900/90 text-zinc-400 text-[11px] font-bold flex items-center justify-between">
                <span>
                  {searchResults.length > 0
                    ? `Found ${searchResults.length} matching client${searchResults.length > 1 ? "s" : ""}`
                    : "No existing clients found"}
                </span>
                <span className="text-[10px] text-zinc-500">Press Enter or click to select</span>
              </div>

              {/* LIST OF MATCHING CLIENTS */}
              {searchResults.length > 0 ? (
                searchResults.map((c, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const cleanP = normalizePhoneNumber(c.phone) || c.phone;
                  const isVip = (c.total_visits || 0) > 5;

                  return (
                    <button
                      key={c.id || idx}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full p-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isHighlighted
                          ? "bg-purple-900/30 border-l-4 border-purple-500"
                          : "hover:bg-zinc-900/80 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-purple-600/20 text-purple-300 font-bold flex items-center justify-center text-xs shrink-0 border border-purple-500/30">
                          {c.gender === "female" ? "👩" : c.gender === "male" ? "👨" : "👤"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                              {c.name}
                            </span>
                            {isVip && (
                              <Badge variant="purple" className="text-[9px] py-0 px-1.5">
                                VIP
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-mono">
                            <span className="flex items-center gap-1 text-purple-300">
                              <Phone className="h-3 w-3" />
                              <span>{cleanP}</span>
                            </span>
                            {c.gender && c.gender !== "unspecified" && (
                              <span className="text-[10px] uppercase text-zinc-500 font-sans">
                                • {c.gender}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-emerald-400 font-mono">
                          {c.total_spent ? formatCurrency(c.total_spent, settings.currency_symbol) : "New"}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {c.total_visits ? `${c.total_visits} visit${c.total_visits > 1 ? "s" : ""}` : "1 visit"}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-zinc-400">
                    No client found for &quot;<span className="text-white font-semibold">{searchQuery}</span>&quot;
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {/* Quick action: use search query as Name */}
                    {isNaN(Number(searchQuery.replace(/\s/g, ""))) && (
                      <button
                        type="button"
                        onClick={() => {
                          handleFieldChange("name", searchQuery.trim());
                          setSearchQuery("");
                          setIsSearchOpen(false);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Use &quot;{searchQuery.trim()}&quot; as Customer Name</span>
                      </button>
                    )}

                    {/* Quick action: use search query as Phone */}
                    {searchQuery.replace(/\D/g, "").length >= 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleFieldChange("phone", searchQuery.replace(/\D/g, ""));
                          setSearchQuery("");
                          setIsSearchOpen(false);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Use &quot;{searchQuery.replace(/\D/g, "")}&quot; as Mobile</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ACTIVE SELECTED CLIENT BADGE (IF LOADED FROM SEARCH OR CRM) */}
        {matchedCustomer && (
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between text-xs sm:text-[11px] animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-zinc-300">Client Selected: </span>
                <strong className="text-white">{matchedCustomer.name}</strong>
                {matchedCustomer.phone && (
                  <span className="font-mono text-purple-300 ml-1.5">
                    ({normalizePhoneNumber(matchedCustomer.phone) || matchedCustomer.phone})
                  </span>
                )}
                <span className="text-zinc-400 ml-1.5">
                  • {matchedCustomer.total_visits} visit{matchedCustomer.total_visits > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono text-emerald-400 font-semibold">
              <span>{formatCurrency(matchedCustomer.total_spent, settings.currency_symbol)}</span>
            </div>
          </div>
        )}

        {/* ALWAYS-EXPANDED CORE FIELDS: NAME, MOBILE, AND GENDER */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* CUSTOMER NAME (5 COLS) */}
          <div className="sm:col-span-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs sm:text-[11px] font-medium text-zinc-400">
                Customer Name {!hasNamedCustomer && <span className="text-zinc-500 font-normal">(Optional)</span>}
              </label>
              {isExistingNameEdited && matchedCustomerByPhone && (
                <span className="text-[9px] text-amber-400 font-bold bg-amber-950/90 border border-amber-700/60 px-1.5 py-0.2 rounded-md">
                  Edited (Original: {matchedCustomerByPhone.name})
                </span>
              )}
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-3.5 sm:w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="e.g. Aditi Rao"
                value={draftCustomer?.name || ""}
                autoComplete="name"
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className={`w-full h-10 sm:h-9 pl-9 pr-3 text-sm sm:text-xs bg-zinc-950/90 border rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 font-medium transition-colors ${
                  isExistingNameEdited
                    ? "border-amber-500/80 focus:ring-amber-500 focus:border-amber-500"
                    : "border-zinc-800 focus:ring-purple-500 focus:border-purple-500"
                }`}
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

          {/* GENDER SELECTION (3 COLS) */}
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs sm:text-[11px] font-medium text-zinc-400">
                Gender {hasNamedCustomer ? <span className="text-rose-400 font-bold">*</span> : <span className="text-zinc-500 font-normal">(Optional)</span>}
              </label>
              {!draftCustomer?.gender || draftCustomer.gender === "unspecified" ? (
                hasNamedCustomer ? (
                  <span className="text-[10px] text-amber-400 font-bold animate-pulse">Required *</span>
                ) : (
                  <span className="text-[10px] text-zinc-500">Optional</span>
                )
              ) : (
                <span className="text-[10px] text-emerald-400 font-medium">✓ {draftCustomer.gender.toUpperCase()}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 bg-zinc-950/90 p-0.5 rounded-xl border border-zinc-800 h-10 sm:h-9 items-center">
              {[
                { id: "female", label: "Female", emoji: "👩" },
                { id: "male", label: "Male", emoji: "👨" },
                { id: "other", label: "Other", emoji: "⚧" },
              ].map((g) => {
                const isSelected = draftCustomer?.gender === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      const newGender = g.id as any;
                      const nextCustomer: Partial<Customer> = {
                        ...(draftCustomer || {}),
                        id: draftCustomer?.id,
                        name: draftCustomer?.name || "",
                        phone: draftCustomer?.phone || "",
                        gender: newGender,
                        created_at: draftCustomer?.created_at || new Date().toISOString(),
                      };
                      setDraftCustomer(nextCustomer);
                      setIsAddingDetails(true);

                      const cleanP = normalizePhoneNumber(draftCustomer?.phone);
                      if (draftCustomer?.name?.trim() && cleanP && cleanP.length >= 7) {
                        const matched = draftCustomer?.id
                          ? allAvailableCustomers.find((c) => c.id === draftCustomer.id)
                          : allAvailableCustomers.find((c) => normalizePhoneNumber(c.phone) === cleanP);
                        saveCustomer({
                          id: draftCustomer?.id || matched?.id || generateUUID(),
                          name: draftCustomer.name.trim(),
                          phone: cleanP,
                          gender: newGender,
                          email: draftCustomer.email || matched?.email,
                          birthday: draftCustomer.birthday || matched?.birthday,
                          notes: draftCustomer.notes || matched?.notes,
                          total_visits: matched?.total_visits || 1,
                          total_spent: matched?.total_spent || 0,
                          created_at: matched?.created_at || draftCustomer.created_at || new Date().toISOString(),
                        });
                      }
                    }}
                    className={`h-full flex items-center justify-center gap-1 rounded-lg text-xs sm:text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-sm font-black scale-102"
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

        {/* MULTIPLE CLIENTS SHARE THIS PHONE NUMBER SWITCHER WIDGET */}
        {matchingCustomersForPhone.length > 1 && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>{matchingCustomersForPhone.length} Client Profiles Found with number <strong className="font-mono text-white">{draftCustomer?.phone}</strong></span>
              </span>
              <span className="text-[10px] text-zinc-400">Click a profile to switch</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {matchingCustomersForPhone.map((c) => {
                const isSelected = draftCustomer?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-purple-600 text-white border-purple-400 shadow-md font-bold ring-2 ring-purple-400/50"
                        : "bg-zinc-900/90 text-zinc-300 border-zinc-700/80 hover:border-purple-500/60 hover:bg-zinc-800"
                    }`}
                  >
                    <span>{c.gender === "female" ? "👩" : c.gender === "male" ? "👨" : "👤"}</span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      ({c.total_visits || 0} {c.total_visits === 1 ? "visit" : "visits"} • {formatCurrency(c.total_spent || 0, settings.currency_symbol)})
                    </span>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* WARNING WHEN EDITING EXISTING USER'S NAME */}
        {isExistingNameEdited && matchedCustomerByPhone && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/70 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  <span>⚠️ Renaming Existing Customer Profile</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-tight mt-1">
                  Mobile number <span className="font-mono font-bold text-white">{draftCustomer?.phone}</span> is registered to <span className="font-bold underline text-white">&quot;{matchedCustomerByPhone.name}&quot;</span>.
                  Renaming to <span className="font-bold text-white">&quot;{draftCustomer?.name}&quot;</span> will update their customer profile in the CRM upon billing/saving.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleFieldChange("name", matchedCustomerByPhone.name)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-600/70 font-bold shrink-0 cursor-pointer transition-all shadow-sm flex items-center gap-1 self-end sm:self-center"
              title="Revert back to original customer name"
            >
              ↩ Revert to &quot;{matchedCustomerByPhone.name}&quot;
            </button>
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
