"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { AppUser } from "@/types";
import {
  Scissors,
  Shield,
  User,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Delete,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginModal() {
  const { users, currentUser, loginWithPin, loginAs, isAuthModalOpen, setIsAuthModalOpen, settings } = useApp();

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!selectedUser && users.length > 0) {
      setSelectedUser(currentUser || users[0]);
    }
  }, [users, currentUser]);

  const handleSelectUser = (user: AppUser) => {
    setSelectedUser(user);
    setPin("");
    setErrorMsg("");
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg("");

      // Auto-submit when 4 digits are entered
      if (newPin.length === 4 && selectedUser) {
        verifyPin(selectedUser.id, newPin);
      }
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  const verifyPin = (userId: string, pinToTest: string) => {
    const success = loginWithPin(userId, pinToTest);
    if (!success) {
      setErrorMsg("Incorrect 4-digit PIN. Please try again.");
      setPin("");
    }
  };

  // If already logged in and modal isn't explicitly forced open, don't show
  if (currentUser && !isAuthModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950/95 p-5 sm:p-7 shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-pink-600/15 blur-3xl pointer-events-none" />

        {/* Close button if user already logged in and just wants to cancel switch */}
        {currentUser && (
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* BRAND HEADER */}
        <div className="flex flex-col items-center text-center pb-5 border-b border-zinc-800/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-purple-600/30 mb-3">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
              <Scissors className="h-6 w-6 text-purple-400 transform -rotate-45" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {settings.salon_name}
            <Sparkles className="h-4 w-4 text-amber-400" />
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select your staff profile & enter 4-digit PIN to unlock
          </p>
        </div>

        {/* PROFILE SELECTION CARDS (1 ADMIN + 3 RECEPTIONISTS) */}
        <div className="py-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
            1. Select Profile:
          </label>

          <div className="grid grid-cols-2 gap-3">
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              const isAdmin = user.role === "admin";

              return (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`group relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none text-center ${
                    isSelected
                      ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/30 scale-102"
                      : "bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800/90 hover:border-zinc-700"
                  }`}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl font-extrabold text-sm text-white mb-2 shadow-inner"
                    style={{ backgroundColor: user.avatar_color }}
                  >
                    {user.name.charAt(0)}
                  </div>

                  <span className="text-xs font-bold text-white line-clamp-1">
                    {user.name}
                  </span>

                  <span
                    className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 ${
                      isAdmin
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-pink-500/20 text-pink-300"
                    }`}
                  >
                    {isAdmin ? "👑 Admin" : "💼 Reception"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PIN KEYPAD & DIRECT ENTRY */}
        {selectedUser && (
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-zinc-400">
                Logging in as: <strong className="text-white">{selectedUser.name}</strong>
              </div>
              <div className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                <Lock className="h-3 w-3 text-purple-400" />
                <span>Enter PIN to unlock</span>
              </div>
            </div>

            {/* PIN DOTS INDICATOR */}
            <div className="flex justify-center items-center gap-3 my-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                      filled
                        ? "bg-purple-500 border-purple-400 scale-110 shadow-md shadow-purple-500/50"
                        : "bg-zinc-900 border-zinc-700"
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-medium my-2 animate-shake">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* NUMERIC KEYPAD */}
            <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto mt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-purple-600 active:text-white border border-zinc-800 text-white font-mono font-bold text-base transition-colors shadow-sm flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin("")}
                className="h-11 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("0")}
                className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-purple-600 active:text-white border border-zinc-800 text-white font-mono font-bold text-base transition-colors shadow-sm flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteDigit}
                className="h-11 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors flex items-center justify-center"
                title="Backspace"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
