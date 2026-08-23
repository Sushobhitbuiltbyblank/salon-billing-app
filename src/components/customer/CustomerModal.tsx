"use client";

import React, { useState, useEffect } from "react";
import { Customer } from "@/types";
import { useApp } from "@/context/AppContext";
import { generateUUID } from "@/lib/utils";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, Phone, Mail, Gift, Heart, FileText, CheckCircle2 } from "lucide-react";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerToEdit?: Customer | null;
  onSaved?: (customer: Customer) => void;
}

export function CustomerModal({
  open,
  onOpenChange,
  customerToEdit,
  onSaved,
}: CustomerModalProps) {
  const { saveCustomer } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"female" | "male" | "other">("female");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [notes, setNotes] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      if (customerToEdit) {
        setName(customerToEdit.name || "");
        setPhone(customerToEdit.phone || "");
        setGender((customerToEdit.gender as any) || "female");
        setEmail(customerToEdit.email || "");
        setBirthday(customerToEdit.birthday || "");
        setAnniversary(customerToEdit.anniversary || "");
        setNotes(customerToEdit.notes || "");
      } else {
        setName("");
        setPhone("");
        setGender("female");
        setEmail("");
        setBirthday("");
        setAnniversary("");
        setNotes("");
      }
      setSaveSuccess(false);
    }
  }, [open, customerToEdit]);

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Customer Name is required.");
      return;
    }

    const customerData: Customer = {
      id: customerToEdit?.id || generateUUID(),
      name: name.trim(),
      phone: phone.trim(),
      gender,
      email: email.trim() || undefined,
      birthday: birthday || undefined,
      anniversary: anniversary || undefined,
      notes: notes.trim() || undefined,
      total_visits: customerToEdit?.total_visits || 0,
      total_spent: customerToEdit?.total_spent || 0,
      last_visit: customerToEdit?.last_visit,
      created_at: customerToEdit?.created_at || new Date().toISOString(),
    };

    const saved = saveCustomer(customerData);
    setSaveSuccess(true);

    if (onSaved) {
      onSaved(saved);
    }

    setTimeout(() => {
      onOpenChange(false);
      setSaveSuccess(false);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="md">
      <form onSubmit={handleSave} className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {customerToEdit ? "Edit Client Profile" : "Register New Client"}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {customerToEdit
                  ? "Update customer CRM info and preferences"
                  : "Save client details to directory & database"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Client details saved successfully!</span>
          </div>
        )}

        <div className="space-y-3.5 pt-1">
          {/* CUSTOMER NAME */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1 block">
              Customer Full Name <span className="text-rose-400 font-bold">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aditi Rao"
                className="w-full h-10 pl-9 pr-3 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-medium"
              />
            </div>
          </div>

          {/* PHONE & GENDER ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* MOBILE NUMBER */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Mobile Number (Optional)
                </label>
                {phone && (
                  <span
                    className={`text-[10px] font-mono font-medium ${
                      phone.length === 10 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {phone.length}/10 {phone.length === 10 ? "✓" : ""}
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="10 Digits (e.g. 9845112345)"
                  className="w-full h-10 pl-9 pr-3 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            {/* MANDATORY GENDER */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                Gender <span className="text-rose-400 font-bold">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 h-10 items-center">
                {[
                  { id: "female", label: "Female", emoji: "👩" },
                  { id: "male", label: "Male", emoji: "👨" },
                  { id: "other", label: "Other", emoji: "⚧" },
                ].map((g) => {
                  const isSelected = gender === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id as any)}
                      className={`h-full flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-sm font-black"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                      }`}
                    >
                      <span>{g.emoji}</span>
                      <span className="text-[11px]">{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1 block">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. client@example.com"
                className="w-full h-10 pl-9 pr-3 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* BIRTHDAY & ANNIVERSARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                Birthday (Optional)
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                Anniversary (Optional)
              </label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  value={anniversary}
                  onChange={(e) => setAnniversary(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* NOTES & PREFERENCES */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1 block">
              Preferences / Allergy Notes / Color Formulas
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Likes ammonia-free shampoo, prefers stylist Amir..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{customerToEdit ? "Update Client Profile" : "Save Customer"}</span>
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
