"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Expense } from "@/types";
import { formatCurrency, formatDate, formatShortDate, generateUUID } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Wallet,
  Plus,
  Trash2,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  Search,
} from "lucide-react";

export function ExpenseManager() {
  const { expenses, addExpense, deleteExpense, settings } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: "Supplies & Products",
    amount: 0,
    payment_mode: "upi",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    logged_by: "Receptionist",
  });

  const categories = [
    "Supplies & Products",
    "Rent & Utilities",
    "Salaries & Advance",
    "Refreshments & Pantry",
    "Marketing & Ads",
    "Maintenance & Repairs",
    "Miscellaneous",
  ];

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category
  const categoryTotals = categories.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return { category: cat, total };
  });

  const filteredExpenses = expenses.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.category.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.logged_by && e.logged_by.toLowerCase().includes(q))
    );
  });

  const handleSave = () => {
    if (!newExpense.amount || newExpense.amount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    const exp: Expense = {
      id: generateUUID(),
      category: newExpense.category || "Miscellaneous",
      amount: Number(newExpense.amount),
      payment_mode: newExpense.payment_mode || "upi",
      description: newExpense.description || "",
      expense_date: newExpense.expense_date || new Date().toISOString().split("T")[0],
      logged_by: newExpense.logged_by || "Receptionist",
      created_at: new Date().toISOString(),
    };

    addExpense(exp);
    setIsModalOpen(false);
    setNewExpense({
      category: "Supplies & Products",
      amount: 0,
      payment_mode: "upi",
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
      logged_by: "Receptionist",
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-400" />
            Salon Expense Tracker
          </h2>
          <p className="text-xs text-zinc-400">
            Log salon overheads, product inventory re-orders, utility bills, and tea/refreshments.
          </p>
        </div>

        <Button variant="accent" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          Log New Expense
        </Button>
      </div>

      {/* EXPENSE SUMMARY TOTALS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-amber-950/20 border-amber-500/30">
          <span className="text-xs text-amber-300 font-semibold">Total Expenses Logged</span>
          <div className="text-2xl font-black text-amber-300 font-mono mt-1">
            {formatCurrency(totalExpenseAmount, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Across {expenses.length} entries
          </div>
        </Card>

        {categoryTotals.slice(0, 3).map((item) => (
          <Card key={item.category} className="bg-zinc-900/80">
            <span className="text-xs text-zinc-400 font-semibold truncate block">
              {item.category}
            </span>
            <div className="text-xl font-bold text-white font-mono mt-1">
              {formatCurrency(item.total, settings.currency_symbol)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {((item.total / (totalExpenseAmount || 1)) * 100).toFixed(0)}% of total expenses
            </div>
          </Card>
        ))}
      </div>

      {/* EXPENSE TRANSACTIONS TABLE */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Expense Records</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-zinc-400">
                      {formatShortDate(exp.expense_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-purple-300">
                      {exp.category}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 max-w-xs truncate">
                      {exp.description || "-"}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-zinc-400">
                      {exp.payment_mode}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {exp.logged_by || "Reception"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-300 text-sm">
                      {formatCurrency(exp.amount, settings.currency_symbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm("Delete this expense entry?")) {
                            deleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG EXPENSE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} maxWidth="md">
        <DialogHeader>
          <DialogTitle>Log Salon Expense</DialogTitle>
          <DialogDescription>
            Record store expenses, inventory refills, or utility costs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-3">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Expense Category *
            </label>
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">
                Amount ({settings.currency_symbol}) *
              </label>
              <input
                type="number"
                min="0"
                value={newExpense.amount || ""}
                onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                placeholder="0"
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">
                Payment Mode
              </label>
              <select
                value={newExpense.payment_mode}
                onChange={(e) => setNewExpense({ ...newExpense, payment_mode: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="upi">UPI / QR Code</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">
              Description / Vendor Details
            </label>
            <input
              type="text"
              placeholder="e.g. L'Oreal developer tubes restock, electricity bill..."
              value={newExpense.description || ""}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Date</label>
              <input
                type="date"
                value={newExpense.expense_date}
                onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1 block">Logged By</label>
              <input
                type="text"
                value={newExpense.logged_by || ""}
                onChange={(e) => setNewExpense({ ...newExpense, logged_by: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave}>
            Save Expense
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
