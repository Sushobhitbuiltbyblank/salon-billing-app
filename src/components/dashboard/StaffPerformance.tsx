"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Staff } from "@/types";
import { calculateStaffPerformance } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Users,
  Award,
  DollarSign,
  Scissors,
  Package,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Edit,
  Plus,
  Phone,
  Percent,
  Calendar,
} from "lucide-react";

export function StaffPerformance() {
  const { staff, invoices, toggleStaffStatus, updateStaff, settings, attendance } = useApp();

  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Calculate real-time commission and volume for all staff
  const staffSummaries = calculateStaffPerformance(invoices, staff);

  const totalIncentives = staffSummaries.reduce(
    (sum, s) => sum + s.total_commission_earned,
    0
  );
  const totalVolume = staffSummaries.reduce(
    (sum, s) => sum + s.total_sales_generated,
    0
  );

  const activeFloorCount = staff.filter((s) => s.status === "active").length;
  const halfDayCount = staff.filter((s) => s.status === "half_day").length;
  const onLeaveCount = staff.filter((s) => s.status === "on_leave").length;
  const weeklyOffCount = staff.filter((s) => s.status === "weekly_off").length;

  const handleEditClick = (s: Staff) => {
    setEditingStaff({ ...s });
    setIsModalOpen(true);
  };

  const handleAddNewStylist = () => {
    const newStaff: Staff = {
      id: `staff-${Date.now()}`,
      name: "",
      phone: "",
      role: "Senior Stylist",
      commission_rate: 15,
      status: "active",
      color: "#8b5cf6",
    };
    setEditingStaff(newStaff);
    setIsModalOpen(true);
  };

  const handleSaveStaff = () => {
    if (!editingStaff || !editingStaff.name.trim()) return;
    updateStaff(editingStaff);
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Staff & Commission Performance
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time individual stylist performance, split-service attribution, and calculated incentive payouts.
          </p>
        </div>

        <Button variant="accent" onClick={handleAddNewStylist} className="gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          Add New Stylist
        </Button>
      </div>

      {/* TOP METRIC STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/80">
          <div className="text-xs text-zinc-400 font-semibold">Floor Attendance Today</div>
          <div className="text-2xl font-black text-white mt-1">
            <span className="text-emerald-400">{activeFloorCount} Present</span>
            {halfDayCount > 0 && <span className="text-amber-400 text-lg ml-2 font-bold">({halfDayCount} Half Day)</span>}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-2">
            <span>{onLeaveCount} on leave</span>
            <span>•</span>
            <span>{weeklyOffCount} off duty</span>
            <span>•</span>
            <span className="font-bold text-zinc-400">{staff.length} Total</span>
          </div>
        </Card>

        <Card className="bg-zinc-900/80">
          <div className="text-xs text-purple-300 font-semibold">Total Staff Sales Volume</div>
          <div className="text-2xl font-black text-purple-300 font-mono mt-1">
            {formatCurrency(totalVolume, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Attributed through single & split line items
          </div>
        </Card>

        <Card className="bg-zinc-900/80 border-emerald-500/30">
          <div className="text-xs text-emerald-400 font-semibold">Total Calculated Incentives</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {formatCurrency(totalIncentives, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Payable commission based on individual tiers
          </div>
        </Card>
      </div>

      {/* STYLIST PERFORMANCE LEADERBOARD TABLE & CARDS */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Stylist Leaderboard & Incentive Tally
          </h3>
          <span className="text-xs text-zinc-400">
            Ordered by total sales volume
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3 px-4">Rank / Stylist</th>
                <th className="py-3 px-4">Role & Attendance</th>
                <th className="py-3 px-4 text-center">Comm. %</th>
                <th className="py-3 px-4 text-center">Services</th>
                <th className="py-3 px-4 text-center">Retail</th>
                <th className="py-3 px-4 text-right">Sales Generated</th>
                <th className="py-3 px-4 text-right">Earned Incentive</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {staffSummaries.map((summary, idx) => {
                const s = summary.staff;
                const status = s.status || "active";

                // Monthly attendance records for this stylist
                const monthlyRecords = attendance.filter(
                  (r) => r.staff_id === s.id && r.date.startsWith(currentMonthStr)
                );
                const pCount = monthlyRecords.filter((r) => r.status === "present").length;
                const hdCount = monthlyRecords.filter((r) => r.status === "half_day").length;
                const lCount = monthlyRecords.filter((r) => r.status === "on_leave").length;

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* STYLIST NAME & AVATAR */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600/30 text-purple-300 font-mono font-bold text-xs">
                          #{idx + 1}
                        </div>
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                          style={{ backgroundColor: s.color || "#8b5cf6" }}
                        >
                          {s.name ? s.name.charAt(0) : "S"}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            {s.name}
                          </div>
                          {s.phone && (
                            <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" />
                              {s.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ROLE & STATUS BADGE */}
                    <td className="py-3.5 px-4">
                      <div className="text-zinc-300 font-medium">{s.role}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => toggleStaffStatus(s.id)}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          title="Click to cycle status: Active -> Half Day -> On Leave"
                        >
                          {status === "active" && (
                            <Badge variant="success" className="text-[10px] py-0 px-2 font-bold">
                              🟢 Present
                            </Badge>
                          )}
                          {status === "half_day" && (
                            <Badge variant="warning" className="text-[10px] py-0 px-2 font-bold bg-amber-950 text-amber-300 border-amber-600">
                              🟡 Half Day
                            </Badge>
                          )}
                          {status === "on_leave" && (
                            <Badge variant="destructive" className="text-[10px] py-0 px-2 font-bold bg-rose-950 text-rose-300 border-rose-600">
                              🔴 On Leave
                            </Badge>
                          )}
                          {status === "weekly_off" && (
                            <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold text-zinc-400 border-zinc-700">
                              ⚪ Weekly Off
                            </Badge>
                          )}
                        </button>

                        <span className="text-[10px] text-zinc-500 font-mono hidden xl:inline" title="Monthly attendance">
                          ({pCount}P • {hdCount}HD • {lCount}L)
                        </span>
                      </div>
                    </td>

                    {/* COMMISSION TIER */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                      <div className="text-emerald-400">
                        {s.commission_type === "fixed"
                          ? `${formatCurrency(s.commission_rate, settings.currency_symbol)} Svc`
                          : `${s.commission_rate}% Svc`}
                      </div>
                      <div className="text-[10px] text-purple-400">
                        {s.product_commission_type === "fixed"
                          ? `${formatCurrency(s.product_commission_rate ?? s.commission_rate, settings.currency_symbol)} Prd`
                          : `${s.product_commission_rate ?? 10}% Prd`}
                      </div>
                    </td>

                    {/* SERVICES COUNT */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 font-mono">
                        <Scissors className="h-3 w-3 text-purple-400" />
                        {summary.services_count}
                      </span>
                    </td>

                    {/* RETAIL PRODUCTS */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 font-mono">
                        <Package className="h-3 w-3 text-amber-400" />
                        {summary.products_count}
                      </span>
                    </td>

                    {/* TOTAL SALES VOLUME */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100 text-sm">
                      {formatCurrency(summary.total_sales_generated, settings.currency_symbol)}
                    </td>

                    {/* EARNED COMMISSION */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-400 text-sm">
                      {formatCurrency(summary.total_commission_earned, settings.currency_symbol)}
                    </td>

                    {/* ACTION */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleEditClick(s)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="Edit staff details"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / ADD STAFF MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} maxWidth="md">
        <DialogHeader>
          <DialogTitle>{editingStaff?.id.startsWith("staff-") ? "Add New Stylist" : "Edit Stylist Details"}</DialogTitle>
          <DialogDescription>
            Configure commission percentage tier and staff information.
          </DialogDescription>
        </DialogHeader>

        {editingStaff && (
          <div className="space-y-3.5 pt-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Full Name *</label>
              <input
                type="text"
                value={editingStaff.name}
                onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                placeholder="e.g. Maya Sen"
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Mobile Number (Optional)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={editingStaff.phone || ""}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  placeholder="e.g. 9876512345"
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Role / Designation</label>
                <input
                  type="text"
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  placeholder="e.g. Senior Color Specialist"
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Status</label>
                <select
                  value={editingStaff.status}
                  onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="active">Active on Floor</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* INCENTIVE SCHEME */}
            <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Staff Incentive & Commission Scheme
              </h5>

              {/* SERVICE INCENTIVE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">Service Incentive</label>
                  <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setEditingStaff({ ...editingStaff, commission_type: "percent" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        editingStaff.commission_type !== "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      % Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStaff({ ...editingStaff, commission_type: "fixed" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        editingStaff.commission_type === "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      ₹ Flat Amount
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder={editingStaff.commission_type === "fixed" ? "e.g. 150 (₹ flat per service)" : "e.g. 15 (% rate)"}
                    value={editingStaff.commission_rate}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, commission_rate: Number(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 pr-16 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">
                    {editingStaff.commission_type === "fixed" ? "₹ / svc" : "% of sale"}
                  </span>
                </div>
              </div>

              {/* PRODUCT INCENTIVE */}
              <div className="space-y-1.5 pt-2.5 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">Product Retail Incentive</label>
                  <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setEditingStaff({ ...editingStaff, product_commission_type: "percent" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        editingStaff.product_commission_type !== "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      % Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStaff({ ...editingStaff, product_commission_type: "fixed" })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        editingStaff.product_commission_type === "fixed"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      ₹ Flat Amount
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder={editingStaff.product_commission_type === "fixed" ? "e.g. 100 (₹ flat per product)" : "e.g. 10 (% rate)"}
                    value={editingStaff.product_commission_rate ?? 10}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, product_commission_rate: Number(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 pr-16 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-purple-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">
                    {editingStaff.product_commission_type === "fixed" ? "₹ / item" : "% of sale"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSaveStaff}>
            Save Stylist
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
