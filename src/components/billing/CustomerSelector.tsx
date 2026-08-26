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

  // UNIFY REGISTERED CUSTOMERS + INVOICE CUSTOMER RECORDS
  const allAvailableCustomers = useMemo(() => {
    return unifyCustomerList(customers, invoices);
  }, [customers, invoices]);

  const handleFieldChange = (field: keyof Customer, value: string) => {
    let cleanValue = value;
    if (field === "phone") {
      // Allow only numbers and maximum 10 digits
      cleanValue = value.replace(/\D/g, "").slice(0, 10);

      // AUTO-PREFILL IF PHONE NUMBER ALREADY EXISTS IN CRM
      if (cleanValue.length === 10 || cleanValue.length >= 7) {
        const existing = allAvailableCustomers.find(
          (c: Customer) => normalizePhoneNumber(c.phone) === cleanValue
        );

        if (existing) {
          const currentName = draftCustomer?.name?.trim() || "";
          const isCurrentAnon = isAnonymousCustomerName(currentName);
          const nameToSet =
            !currentName || isCurrentAnon
              ? existing.name
              : draftCustomer?.name || existing.name;

          setDraftCustomer({
            ...(draftCustomer || {}),
            id: existing.id || draftCustomer?.id,
            phone: cleanValue,
            name: nameToSet,
            gender:
              existing.gender && existing.gender !== "unspecified"
                ? existing.gender
                : draftCustomer?.gender || "female",
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
      setDraftCustomer({ [field]: cleanValue });
    } else {
      setDraftCustomer({ ...draftCustomer, [field]: cleanValue });
    }
  };

  const handleResetToWalkIn = () => {
    setDraftCustomer(null);
    setIsAddingDetails(false);
    setShowAdvanced(false);
  };

  // Specific customer record matched by the entered phone number
  const matchedCustomerByPhone = useMemo(() => {
    if (!draftCustomer?.phone) return null;
    const cleanPhone = normalizePhoneNumber(draftCustomer.phone);
    if (cleanPhone.length < 7) return null;

    return (
      allAvailableCustomers.find(
        (c: Customer) => normalizePhoneNumber(c.phone) === cleanPhone
      ) || null
    );
  }, [draftCustomer?.phone, allAvailableCustomers]);

  // Detect if user has modified the registered name of this existing customer
  const isExistingNameEdited = useMemo(() => {
    if (!matchedCustomerByPhone || !matchedCustomerByPhone.name) return false;
    if (isAnonymousCustomerName(matchedCustomerByPhone.name)) return false;

    const currentDraftName = draftCustomer?.name?.trim() || "";
    if (!currentDraftName || isAnonymousCustomerName(currentDraftName)) return false;

    return (
      normalizeCustomerName(currentDraftName) !==
      normalizeCustomerName(matchedCustomerByPhone.name)
    );
  }, [matchedCustomerByPhone, draftCustomer?.name]);

  const matchedCustomer = useMemo(() => {
    if (!draftCustomer) return null;
    const cleanPhone = normalizePhoneNumber(draftCustomer.phone);
    const cleanName = normalizeCustomerName(draftCustomer.name);
    const isAnon = isAnonymousCustomerName(draftCustomer.name);

    if (cleanPhone.length >= 7) {
      const byPhone = allAvailableCustomers.find(
        (c: Customer) => normalizePhoneNumber(c.phone) === cleanPhone
      );
      if (byPhone) return byPhone;
    }

    if (!isAnon && cleanName) {
      return (
        allAvailableCustomers.find((c: Customer) => {
          const cName = normalizeCustomerName(c.name);
          const cPhone = normalizePhoneNumber(c.phone);
          if (cName === cleanName) {
            return !cleanPhone || !cPhone || cleanPhone === cPhone;
          }
          return false;
        }) || null
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
    const cleanPhone = normalizePhoneNumber(draftCustomer?.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("A valid 10-digit mobile number is required to save customer profile in CRM.");
      return;
    }
    const saved = saveCustomer({
      id: draftCustomer.id || generateUUID(),
      name: draftCustomer.name.trim(),
      phone: cleanPhone,
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
                  : "Enter mobile number to auto-fill returning client or add new"}
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

        {/* ALWAYS-EXPANDED CORE FIELDS: NAME, MOBILE, AND MANDATORY GENDER */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* CUSTOMER NAME (5 COLS) */}
          <div className="sm:col-span-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs sm:text-[11px] font-medium text-zinc-400">
                Customer Name <span className="text-rose-400 font-bold">*</span>
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
                  Mobile number <span className="font-mono font-bold text-white">{draftCustomer?.phone}</span> is registered to <span className="font-bold underline text-white">"{matchedCustomerByPhone.name}"</span>.
                  Renaming to <span className="font-bold text-white">"{draftCustomer?.name}"</span> will update their customer profile in the CRM upon billing/saving.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleFieldChange("name", matchedCustomerByPhone.name)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-600/70 font-bold shrink-0 cursor-pointer transition-all shadow-sm flex items-center gap-1 self-end sm:self-center"
              title="Revert back to original customer name"
            >
              ↩ Revert to "{matchedCustomerByPhone.name}"
            </button>
          </div>
        )}

        {/* REPEAT CLIENT STATS SUMMARY BANNER */}
        {matchedCustomer && !isExistingNameEdited && (
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
