"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { CatalogItem } from "@/types";
import {
  Search,
  Sparkles,
  Clock,
  Package,
  Plus,
  Scissors,
  Palette,
  Hand,
  UserCheck,
  Droplets,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function CatalogGrid() {
  const { catalog, categories, addDraftItem, draftItems, settings } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "service" | "product">("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return catalog.filter((item) => {
      // Type filter
      if (selectedType !== "all" && item.type !== selectedType) {
        return false;
      }
      // Category filter
      if (selectedCategoryId !== "all" && item.category_id !== selectedCategoryId) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = item.sku ? item.sku.toLowerCase().includes(q) : false;
        return matchesName || matchesSku;
      }
      return true;
    });
  }, [catalog, selectedType, selectedCategoryId, searchQuery]);

  // Map icons
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case "Scissors":
        return <Scissors className="h-3.5 w-3.5" />;
      case "Palette":
        return <Palette className="h-3.5 w-3.5" />;
      case "Sparkles":
        return <Sparkles className="h-3.5 w-3.5" />;
      case "Hand":
        return <Hand className="h-3.5 w-3.5" />;
      case "UserCheck":
        return <UserCheck className="h-3.5 w-3.5" />;
      case "Droplets":
        return <Droplets className="h-3.5 w-3.5" />;
      default:
        return <Package className="h-3.5 w-3.5" />;
    }
  };

  const getItemCountInCart = (itemId: string) => {
    const found = draftItems.find((i) => i.item_id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-4 backdrop-blur-xl shadow-lg">
      {/* SEARCH AND TYPE FILTER */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search service or retail product..."
            value={searchQuery}
            autoComplete="off"
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 sm:h-9 pl-9 pr-3 text-sm sm:text-xs bg-zinc-950/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* TYPE TABS: ALL / SERVICES / PRODUCTS */}
        <div className="flex items-center bg-zinc-950/90 p-1 rounded-xl border border-zinc-800/90 shrink-0">
          <button
            onClick={() => {
              setSelectedType("all");
              setSelectedCategoryId("all");
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedType === "all"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setSelectedType("service");
              setSelectedCategoryId("all");
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedType === "service"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Services
          </button>
          <button
            onClick={() => {
              setSelectedType("product");
              setSelectedCategoryId("all");
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedType === "product"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Retail
          </button>
        </div>
      </div>

      {/* CATEGORY PILLS SCROLLER */}
      <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-b border-zinc-800/40">
        <button
          onClick={() => setSelectedCategoryId("all")}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium shrink-0 transition-all ${
            selectedCategoryId === "all"
              ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
              : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          }`}
        >
          <span>All Categories</span>
        </button>

        {categories
          .filter((cat) => (selectedType === "all" ? true : cat.type === selectedType))
          .map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium shrink-0 transition-all ${
                  isSelected
                    ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30"
                    : "bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {getCategoryIcon(cat.icon)}
                <span>{cat.name}</span>
              </button>
            );
          })}
      </div>

      {/* CATALOG ITEM CARDS GRID */}
      <div className="flex-1 overflow-y-auto pt-3 pr-1">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500">
            <Package className="h-8 w-8 mb-2 opacity-40 text-purple-400" />
            <p className="text-xs">No services or products found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2.5">
            {filteredItems.map((item) => {
              const qtyInCart = getItemCountInCart(item.id);
              const isService = item.type === "service";

              return (
                <div
                  key={item.id}
                  onClick={() => addDraftItem(item)}
                  className={`group relative flex flex-col justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                    qtyInCart > 0
                      ? "bg-purple-950/25 border-purple-500/50 shadow-md shadow-purple-900/20"
                      : "bg-zinc-950/60 hover:bg-zinc-900/90 border-zinc-800/80 hover:border-purple-500/30"
                  }`}
                >
                  {/* CARD TOP INFO */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1 ${
                            isService
                              ? "bg-purple-500/15 text-purple-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {isService ? "Service" : "Retail Product"}
                        </span>
                        <h4 className="text-xs font-bold text-zinc-100 group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight">
                          {item.name}
                        </h4>
                      </div>

                      {/* IN CART BADGE */}
                      {qtyInCart > 0 && (
                        <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 text-white font-mono text-[10px] font-extrabold px-1.5 shadow-sm animate-in zoom-in-75">
                          <Check className="h-2.5 w-2.5 mr-0.5" />
                          {qtyInCart}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD BOTTOM INFO: PRICE & ACTION */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-emerald-400 font-mono">
                        {formatCurrency(item.price, settings.currency_symbol)}
                      </span>
                      {isService && item.duration_mins && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 text-zinc-400" />
                          {item.duration_mins} min
                        </span>
                      )}
                      {!isService && item.stock_qty !== undefined && (
                        <span className="text-[10px] text-zinc-400">
                          Stock: {item.stock_qty} pcs
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm"
                      title="Add to Invoice"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
