"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { SalonSettings } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  Settings,
  Store,
  QrCode,
  Printer,
  Sparkles,
  Save,
  CheckCircle2,
  Database,
  Star,
  Camera,
  Percent,
} from "lucide-react";

export function SalonSettingsView() {
  const { settings, updateSettings } = useApp();
  const [formData, setFormData] = useState<SalonSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const hasSupabase = isSupabaseConfigured();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-400" />
            Salon Profile & POS Configuration
          </h2>
          <p className="text-xs text-zinc-400">
            Configure business details, GSTIN, UPI payment QR, thermal receipt settings, and review links.
          </p>
        </div>

        <Button variant="accent" type="submit" className="gap-2">
          {savedSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Configuration</span>
            </>
          )}
        </Button>
      </div>

      {/* SUPABASE CONNECTION POSTGRESQL STATUS CARD */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          hasSupabase
            ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
            : "bg-purple-950/20 border-purple-800/40 text-purple-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600/30 flex items-center justify-center text-purple-300">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Database Backend: {hasSupabase ? "Supabase Live Connected" : "Local Storage + PostgreSQL Schema Ready"}
            </h4>
            <p className="text-xs text-zinc-400">
              {hasSupabase
                ? "All transactions, staff, and customer data sync live with your remote Supabase instance."
                : "Application is running seamlessly in Demo & Offline storage mode. Full migration SQL is ready in supabase/schema.sql."}
            </p>
          </div>
        </div>
      </div>

      {/* SALON BUSINESS PROFILE */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Store className="h-4 w-4 text-purple-400" />
          Salon Identity & Receipt Header
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Salon / Spa Business Name *
            </label>
            <input
              type="text"
              value={formData.salon_name}
              onChange={(e) => setFormData({ ...formData, salon_name: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Brand Tagline / Subtitle
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Full Store Address (Printed on Thermal Receipt)
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Contact Phone Number
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Billing Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
      </Card>

      {/* TAX & INVOICE NUMBERING */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Percent className="h-4 w-4 text-emerald-400" />
          Tax (GST) & Invoicing Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              GSTIN / Tax ID Number
            </label>
            <input
              type="text"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              placeholder="e.g. 29ABCDE1234F1Z5"
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              GST Tax Rate (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.tax_rate === 0 ? "" : formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value === "" ? 0 : Number(e.target.value) || 0 })}
              placeholder="0"
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="tax_enabled"
            checked={formData.tax_enabled}
            onChange={(e) => setFormData({ ...formData, tax_enabled: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-700 accent-purple-600 bg-zinc-900"
          />
          <label htmlFor="tax_enabled" className="text-xs font-medium text-zinc-300">
            Automatically calculate and apply GST on all customer invoices
          </label>
        </div>
      </Card>

      {/* DYNAMIC QR CODES & SOCIAL REPUTATION */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-pink-400" />
          Dynamic QR Codes & Social Links (Printed on Receipts)
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              UPI VPA ID (For Instant Dynamic Amount Payment QR)
            </label>
            <input
              type="text"
              value={formData.upi_id}
              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              placeholder="e.g. yoursalon@okaxis or yoursalon@icici"
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Google Business Review Page Link
            </label>
            <input
              type="url"
              value={formData.google_review_url}
              onChange={(e) => setFormData({ ...formData, google_review_url: e.target.value })}
              placeholder="https://g.page/r/CbGd_cwnL9zrEBM/review"
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-pink-400" />
              Instagram Profile URL
            </label>
            <input
              type="url"
              value={formData.instagram_url}
              onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
              placeholder="https://www.instagram.com/beleziasalonlaxminagar"
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
      </Card>
    </form>
  );
}
