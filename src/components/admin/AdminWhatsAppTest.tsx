"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Customer } from "@/types";
import { cleanPhoneNumber, SALON_EVENT_DATE, SALON_EVENT_VENUE, LOREAL_EVENT_TERMS_SHORT } from "@/lib/whatsapp";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deduplicateCustomerArray } from "@/lib/customerUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Search,
  User,
  Phone,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  X,
  FileText,
  Calendar,
  Smartphone,
  Eye,
  Sliders,
  Terminal,
  Zap,
} from "lucide-react";

export interface WhatsAppApiConfig {
  provider: "mock" | "meta" | "custom_webhook";
  apiToken: string;
  phoneNumberId: string;
  apiUrl: string;
}

const DEFAULT_CONFIG: WhatsAppApiConfig = {
  provider: "mock",
  apiToken: "",
  phoneNumberId: "",
  apiUrl: "",
};

export interface MessageLogEntry {
  id: string;
  timestamp: string;
  phone: string;
  customerName: string;
  message: string;
  provider: string;
  mode: "sandbox" | "live";
  status: "success" | "error";
  durationMs?: number;
  messageId?: string;
  error?: string;
  responsePayload?: any;
  clickToChatUrl?: string;
}

const CONFIG_STORAGE_KEY = "belezia_whatsapp_api_config_v1";
const LOGS_STORAGE_KEY = "belezia_whatsapp_test_logs_v1";

interface AdminWhatsAppTestProps {
  standalone?: boolean;
}

export function AdminWhatsAppTest({ standalone = false }: AdminWhatsAppTestProps) {
  const { customers, invoices, settings } = useApp();

  // Search & Selected Customer State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customPhone, setCustomPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [useCustomNumber, setUseCustomNumber] = useState(false);

  // Message Composer State
  const [messageText, setMessageText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("spin_invite");

  // Dispatch State
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    messageId?: string;
    durationMs?: number;
    clickToChatUrl?: string;
    responsePayload?: any;
  } | null>(null);

  // API Config State
  const [config, setConfig] = useState<WhatsAppApiConfig>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Logs History State
  const [logs, setLogs] = useState<MessageLogEntry[]>([]);
  const [inspectLog, setInspectLog] = useState<MessageLogEntry | null>(null);

  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved config & logs on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCfg = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (savedCfg) setConfig(JSON.parse(savedCfg));
        const savedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
        if (savedLogs) setLogs(JSON.parse(savedLogs));
      } catch {}
    }
  }, []);

  const saveConfig = (newCfg: WhatsAppApiConfig) => {
    setConfig(newCfg);
    if (typeof window !== "undefined") {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newCfg));
    }
  };

  const addLog = (entry: MessageLogEntry) => {
    setLogs((prev) => {
      const updated = [entry, ...prev.slice(0, 49)];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const clearLogs = () => {
    if (confirm("Are you sure you want to clear the WhatsApp test dispatch log?")) {
      setLogs([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOGS_STORAGE_KEY);
      }
    }
  };

  // Deduplicate and enrich customers from DB
  const unifiedCustomers = useMemo(() => {
    const list = deduplicateCustomerArray(customers || []);
    return list.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
  }, [customers]);

  // Filtered customer list for search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      return unifiedCustomers.slice(0, 8); // Top 8 by spend when not searching
    }
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = cleanPhoneNumber(q);
    return unifiedCustomers
      .filter((c) => {
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const phoneMatch = cleanPhoneNumber(c.phone).includes(cleanQ || q);
        return nameMatch || phoneMatch;
      })
      .slice(0, 15);
  }, [unifiedCustomers, searchQuery]);

  // Active recipient info
  const activeRecipient = useMemo(() => {
    if (useCustomNumber) {
      return {
        name: customName.trim() || "Guest Customer",
        phone: cleanPhoneNumber(customPhone),
        displayPhone: customPhone,
      };
    }
    if (selectedCustomer) {
      return {
        name: selectedCustomer.name || "Customer",
        phone: cleanPhoneNumber(selectedCustomer.phone),
        displayPhone: selectedCustomer.phone,
      };
    }
    return null;
  }, [useCustomNumber, customName, customPhone, selectedCustomer]);

  // Pre-built Message Templates
  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const custName = activeRecipient?.name || "{{name}}";
    const salonName = settings.salon_name || "Belezia Salon";
    const bookingPhone = settings.phone || "+91-7290828680";

    switch (templateKey) {
      case "spin_invite":
        setMessageText(
          `✨ *Exclusive VIP Invitation: L'Oréal Professional Day!* ✨\n\nDear ${custName},\n\nYou are cordially invited to *Belezia Salon Laxmi Nagar* for our exclusive *L'Oréal Day & Lucky Wheel Campaign*!\n\n🎁 *Spin & Win Guaranteed Prizes:* Free L'Oréal Shampoos, Absolute Repair Hair Masks, Free D-Tan Services & Haircuts!\n\n🎡 *Spin your lucky wheel now:*\nhttps://belezia-offers.vercel.app/spin?phone=${activeRecipient?.phone || ""}\n\n📅 *Event Date:* ${SALON_EVENT_DATE}\n📍 *Venue:* ${SALON_EVENT_VENUE}\n\n${LOREAL_EVENT_TERMS_SHORT}\n\nWe look forward to welcoming you!\n— *${salonName} Team* 💇‍♀️`
        );
        break;

      case "bill_link":
        setMessageText(
          `🧾 *Digital Invoice from ${salonName}*\n\nDear ${custName},\n\nThank you for visiting us today! Your digital GST invoice is ready to view & download:\n\n🔗 *View Receipt:* https://belezia-salon-billing-app.vercel.app/receipt/latest\n\nNeed assistance or want to rebook? Contact us at ${bookingPhone}.\n\nHave a wonderful day! ✨`
        );
        break;

      case "special_offer":
        setMessageText(
          `💖 *Special Compliments from ${salonName}* 💖\n\nHi ${custName},\n\nWe appreciate your loyalty! Enjoy a *Complimentary Face De-Tan Treatment* on your next visit of ₹799 or more.\n\n📞 *Book Your Slot:* Call/WhatsApp ${bookingPhone}\n📍 *Location:* ${settings.address || "Belezia Salon, Laxmi Nagar, Delhi"}\n\n_Valid for the next 7 days only. Show this message at reception to redeem._`
        );
        break;

      case "appointment_reminder":
        setMessageText(
          `⏰ *Appointment Reminder — ${salonName}*\n\nHello ${custName},\n\nThis is a friendly reminder for your upcoming salon session scheduled at *${salonName}*.\n\n📅 *Date:* Today\n📍 *Address:* ${settings.address || "Laxmi Nagar, Delhi"}\n\nIf you need to reschedule or have special preferences, please reply directly or call ${bookingPhone}.\n\nSee you soon! ✂️`
        );
        break;

      case "ping_test":
        setMessageText(
          `🧪 *Belezia Salon WhatsApp API Test*\n\nHello ${custName},\nThis is an automated test message dispatched from the Belezia Salon POS administrative console.\n\nTimestamp: ${new Date().toLocaleTimeString()} • Status: Active ✅`
        );
        break;

      default:
        break;
    }
  };

  // Auto-apply default template if message is blank
  useEffect(() => {
    if (!messageText) {
      applyTemplate("spin_invite");
    }
  }, [activeRecipient?.name]);

  // Insert variable tag at cursor
  const insertTag = (tag: string) => {
    if (!messageTextareaRef.current) return;
    const textarea = messageTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = messageText.substring(0, start) + tag + messageText.substring(end);
    setMessageText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Resolved message preview with placeholder tags replaced
  const resolvedMessage = useMemo(() => {
    let msg = messageText;
    const name = activeRecipient?.name || "Valued Customer";
    const phone = activeRecipient?.phone || "98XXXXXXXX";
    const salonName = settings.salon_name || "Belezia Salon";
    msg = msg.replace(/{{name}}/g, name);
    msg = msg.replace(/{{phone}}/g, phone);
    msg = msg.replace(/{{salon_name}}/g, salonName);
    msg = msg.replace(/{{date}}/g, new Date().toLocaleDateString("en-IN"));
    return msg;
  }, [messageText, activeRecipient, settings.salon_name]);

  // Execute WhatsApp API Send
  const handleSendMessage = async () => {
    if (!activeRecipient?.phone || activeRecipient.phone.length !== 10) {
      alert("Please select a customer or enter a valid 10-digit mobile number.");
      return;
    }
    if (!resolvedMessage.trim()) {
      alert("Please enter message content.");
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: activeRecipient.phone,
          customerName: activeRecipient.name,
          message: resolvedMessage,
          provider: config.provider,
          config: {
            apiToken: config.apiToken,
            phoneNumberId: config.phoneNumberId,
            apiUrl: config.apiUrl,
          },
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setLastResult({
          success: true,
          message: `Message dispatched successfully to +91 ${activeRecipient.phone}`,
          messageId: data.messageId,
          durationMs: data.durationMs,
          clickToChatUrl: data.clickToChatUrl,
          responsePayload: data.responsePayload,
        });

        addLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          phone: activeRecipient.phone,
          customerName: activeRecipient.name,
          message: resolvedMessage,
          provider: config.provider,
          mode: data.mode || (config.provider === "mock" ? "sandbox" : "live"),
          status: "success",
          durationMs: data.durationMs,
          messageId: data.messageId,
          responsePayload: data.responsePayload,
          clickToChatUrl: data.clickToChatUrl,
        });
      } else {
        setLastResult({
          success: false,
          error: data.error || `Failed to send message (HTTP ${res.status})`,
          clickToChatUrl: data.clickToChatUrl,
          responsePayload: data.details || data,
        });

        addLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          phone: activeRecipient.phone,
          customerName: activeRecipient.name,
          message: resolvedMessage,
          provider: config.provider,
          mode: config.provider === "mock" ? "sandbox" : "live",
          status: "error",
          error: data.error || "API returned error",
          responsePayload: data.details || data,
          clickToChatUrl: data.clickToChatUrl,
        });
      }
    } catch (err: any) {
      setLastResult({
        success: false,
        error: err?.message || "Network exception while contacting WhatsApp API server.",
      });

      addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        phone: activeRecipient.phone,
        customerName: activeRecipient.name,
        message: resolvedMessage,
        provider: config.provider,
        mode: config.provider === "mock" ? "sandbox" : "live",
        status: "error",
        error: err?.message || "Network failure",
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* TOP HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-purple-950/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                WhatsApp API Testing Console
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                {config.provider === "mock" ? "SANDBOX SIMULATOR" : config.provider.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select contacts from your client database, compose customized messages, and test automated WhatsApp API message triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfigOpen(true)}
            className="border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
          >
            <Settings2 className="h-3.5 w-3.5 text-purple-400" />
            <span>API Settings</span>
          </Button>

          {!standalone && (
            <Link
              href="/admin/whatsapp-test"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all cursor-pointer"
              title="Open full page in standalone tab"
            >
              <span>Full Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* MAIN 2-COLUMN LAYOUT: CONTACT SELECTOR (LEFT) + MESSAGE COMPOSER & PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =========================================================================
            LEFT COLUMN (5 COLS): CLIENT PICKER & RECIPIENT SETUP
            ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-zinc-900/90 border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">1. Select Recipient</h2>
              </div>
              <button
                onClick={() => {
                  setUseCustomNumber(!useCustomNumber);
                  setSelectedCustomer(null);
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                {useCustomNumber ? "← Search Client Database" : "+ Custom Test Number"}
              </button>
            </div>

            {/* CUSTOM NUMBER MODE */}
            {useCustomNumber ? (
              <div className="space-y-3 p-3.5 rounded-xl bg-zinc-950/80 border border-purple-500/30 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Manual Test Number (Not in DB)</span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. John Doe / My Test Phone"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    WhatsApp Mobile Number (10 digits) *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-2 rounded-lg">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* DATABASE CLIENT SEARCH MODE */
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client by name or phone..."
                    className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* SELECTED CUSTOMER CHIP */}
                {selectedCustomer && (
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-bold text-sm text-purple-300">
                        {(selectedCustomer.name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{selectedCustomer.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            (+91 {cleanPhoneNumber(selectedCustomer.phone)})
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>Visits: {selectedCustomer.total_visits || 1}</span>
                          <span>•</span>
                          <span>Spent: {formatCurrency(selectedCustomer.total_spent || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
                      title="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* CLIENTS LIST */}
                <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 px-1 py-0.5">
                    {searchQuery ? `Search Results (${filteredCustomers.length})` : "Top Clients in Database"}
                  </div>
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-xs">
                      No customers found matching &quot;{searchQuery}&quot;.
                    </div>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const clean = cleanPhoneNumber(cust.phone);
                      const isSelected = selectedCustomer?.id === cust.id;
                      return (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setUseCustomNumber(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "bg-purple-600/20 border-purple-500/60 shadow-sm"
                              : "bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                              {(cust.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{cust.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">+91 {clean}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono font-bold text-purple-300">
                              {formatCurrency(cust.total_spent || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ACTIVE RECIPIENT SUMMARY BADGE */}
            {activeRecipient ? (
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Target Number:</span>
                <span className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  +91 {activeRecipient.phone}
                </span>
              </div>
            ) : (
              <div className="pt-2 border-t border-zinc-800/80 text-center text-xs text-amber-400/90 font-medium">
                ⚠️ Select a client above to enable sending
              </div>
            )}
          </Card>

          {/* QUICK TEMPLATES PICKER */}
          <Card className="bg-zinc-900/90 border-zinc-800 p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Quick Message Templates
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: "spin_invite", label: "🎟️ Lucky Wheel Invite" },
                { id: "bill_link", label: "🧾 Digital Bill Link" },
                { id: "special_offer", label: "✨ De-Tan Promo Offer" },
                { id: "appointment_reminder", label: "⏰ Booking Reminder" },
                { id: "ping_test", label: "🧪 2-Line API Ping" },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    selectedTemplate === tpl.id
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (7 COLS): MESSAGE COMPOSER & LIVE WHATSAPP PREVIEW
            ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-zinc-900/90 border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">2. Message Editor</h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {messageText.length} characters
              </span>
            </div>

            {/* VARIABLE INSERT TAGS */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-bold mr-1">Insert Tags:</span>
              {[
                { tag: "{{name}}", label: "Client Name" },
                { tag: "{{phone}}", label: "Phone" },
                { tag: "{{salon_name}}", label: "Salon Name" },
                { tag: "{{date}}", label: "Today's Date" },
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertTag(item.tag)}
                  className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-purple-600/30 text-purple-300 border border-zinc-700 hover:border-purple-500/40 text-[10px] font-mono transition-all cursor-pointer"
                >
                  +{item.tag}
                </button>
              ))}
            </div>

            {/* TEXTAREA INPUT */}
            <div>
              <textarea
                ref={messageTextareaRef}
                rows={7}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write message text here... Supports WhatsApp formatting like *bold*, _italics_, ~strikethrough~"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-y"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Tip: Use <code className="text-purple-300">*bold*</code> for bold, <code className="text-purple-300">_italics_</code> for italics, and line breaks for clean paragraphing.
              </p>
            </div>

            {/* LIVE WHATSAPP CHAT BUBBLE PREVIEW */}
            <div className="rounded-2xl bg-[#0b141a] border border-zinc-800 p-3.5 shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80 text-[10px] text-zinc-400">
                <div className="flex items-center gap-1.5 font-bold text-zinc-300">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>WhatsApp Live Phone Preview</span>
                </div>
                <span>To: {activeRecipient?.displayPhone || "Client"}</span>
              </div>

              {/* CHAT BUBBLE */}
              <div className="max-w-[92%] ml-auto bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-sm p-3 text-xs shadow-md leading-relaxed whitespace-pre-wrap select-text">
                {resolvedMessage || <span className="text-zinc-400 italic">Message preview will appear here...</span>}
                <div className="text-[9px] text-[#8696a0] text-right mt-1.5 flex items-center justify-end gap-1">
                  <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-[#53bdeb] font-bold">✓✓</span>
                </div>
              </div>
            </div>

            {/* DISPATCH ACTION BAR */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Provider:{" "}
                <span className="font-bold text-white capitalize">
                  {config.provider === "mock" ? "Sandbox Simulator" : config.provider}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* FALLBACK DIRECT CLICK-TO-CHAT BUTTON */}
                {activeRecipient?.phone && (
                  <a
                    href={`https://wa.me/91${activeRecipient.phone}?text=${encodeURIComponent(
                      resolvedMessage
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
                    title="Open in real WhatsApp Web as fallback"
                  >
                    <span>Open in Web</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* MAIN SEND VIA API BUTTON */}
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !activeRecipient?.phone || !resolvedMessage.trim()}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending API Call...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Trigger API Send</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* REAL-TIME SEND RESULT BANNER */}
            {lastResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs animate-in fade-in duration-200 ${
                  lastResult.success
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {lastResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">
                      {lastResult.success ? lastResult.message : lastResult.error}
                    </p>
                    {lastResult.messageId && (
                      <p className="font-mono text-[10px] text-zinc-400 mt-0.5 truncate">
                        Message ID: {lastResult.messageId} • Duration: {lastResult.durationMs}ms
                      </p>
                    )}
                    {lastResult.clickToChatUrl && (
                      <a
                        href={lastResult.clickToChatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline mt-1.5 font-bold"
                      >
                        Verify in WhatsApp Web →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* =========================================================================
          DISPATCH AUDIT LOG / TESTING HISTORY TABLE
          ========================================================================= */}
      <Card className="bg-zinc-900/90 border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Live Testing Dispatch History</h3>
            <span className="text-xs text-zinc-500">({logs.length} attempts recorded)</span>
          </div>
          {logs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="border-zinc-800 text-zinc-400 hover:text-rose-400 text-xs h-7 cursor-pointer"
            >
              Clear Log
            </Button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800/60">
            No API test messages sent yet in this session. Trigger a send above to view live audit traces.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] text-zinc-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Message Excerpt</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-white text-xs">{entry.customerName}</div>
                      <div className="font-mono text-[10px] text-zinc-400">+91 {entry.phone}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {entry.status === "success" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[320px]">
                      <p className="truncate text-zinc-300">{entry.message}</p>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-[10px] uppercase text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                        {entry.provider} ({entry.mode})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setInspectLog(entry)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold cursor-pointer"
                        title="Inspect full JSON payload"
                      >
                        JSON
                      </button>
                      {entry.clickToChatUrl && (
                        <a
                          href={entry.clickToChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          wa.me ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* =========================================================================
          MODAL: API CREDENTIALS & PROVIDER CONFIGURATION
          ========================================================================= */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-400" />
                WhatsApp API Provider Setup
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Configure your WhatsApp Business Cloud API or custom SMS gateway credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* PROVIDER PICKER */}
              <div>
                <label className="font-bold text-zinc-300 block mb-1.5">Choose Gateway / Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "mock", label: "Sandbox Simulator", sub: "Safe Testing" },
                    { id: "meta", label: "Meta Cloud API", sub: "Official WhatsApp" },
                    { id: "custom_webhook", label: "Custom Webhook", sub: "SMS / HTTP" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setConfig({ ...config, provider: p.id as any })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        config.provider === p.id
                          ? "bg-purple-600/20 border-purple-500 text-white font-bold shadow-sm"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850"
                      }`}
                    >
                      <div className="text-xs">{p.label}</div>
                      <div className="text-[10px] text-zinc-500">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* META PROVIDER FIELDS */}
              {config.provider === "meta" && (
                <div className="space-y-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      Phone Number ID *
                    </label>
                    <input
                      type="text"
                      value={config.phoneNumberId}
                      onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                      placeholder="e.g. 109827364512345"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      Permanent Access Token / API Key *
                    </label>
                    <input
                      type="password"
                      value={config.apiToken}
                      onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                      placeholder="EAAGm0PX4ZC..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* CUSTOM WEBHOOK FIELDS */}
              {config.provider === "custom_webhook" && (
                <div className="space-y-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      Endpoint URL *
                    </label>
                    <input
                      type="url"
                      value={config.apiUrl}
                      onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                      placeholder="https://api.sms-gateway.com/v1/send"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      Bearer Token / API Secret
                    </label>
                    <input
                      type="password"
                      value={config.apiToken}
                      onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                      placeholder="Bearer token if required"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* SANDBOX MODE EXPLANATION */}
              {config.provider === "mock" && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Sandbox / Simulator Mode Active
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Test full request formatting, phone normalization, character count, and message delivery flows without spending WhatsApp message credits or needing live Meta API keys.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(false)}
                className="border-zinc-800 text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  saveConfig(config);
                  setIsConfigOpen(false);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Settings
              </Button>
            </DialogFooter>
          </div>
        </div>
      </Dialog>

      {/* =========================================================================
          MODAL: INSPECT RAW JSON PAYLOAD
          ========================================================================= */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">API Response Inspector</h3>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 max-h-[360px] overflow-auto">
              <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(inspectLog.responsePayload || inspectLog, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInspectLog(null)}
                className="border-zinc-800 text-zinc-300 text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
