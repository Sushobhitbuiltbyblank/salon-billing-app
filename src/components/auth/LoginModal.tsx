"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { AppUser } from "@/types";
import { DEFAULT_USERS } from "@/lib/storage";
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
  Mail,
  KeyRound,
  LogIn,
  LogOut,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginModal() {
  const {
    users,
    currentUser,
    loginWithPin,
    loginWithEmailAndPin,
    logout,
    isAuthModalOpen,
    setIsAuthModalOpen,
    settings,
  } = useApp();

  const [mode, setMode] = useState<"staff" | "visitor">("staff");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pin, setPin] = useState<string>("");
  const [visitorEmail, setVisitorEmail] = useState<string>("");
  const [visitorPin, setVisitorPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter staff profiles (Sushobhit Jain, Prabhat Jain, Amit Sharma)
  const staffUsers = (users || []).filter(
    (u) => u && typeof u === "object" && typeof u.id === "string" && !u.id.startsWith("usr-visitor-")
  );
  const displayStaff = staffUsers.length > 0 ? staffUsers : DEFAULT_USERS;

  useEffect(() => {
    if (!selectedUser && displayStaff.length > 0) {
      const defaultStaff =
        currentUser && typeof currentUser.id === "string" && !currentUser.id.startsWith("usr-visitor-")
          ? currentUser
          : displayStaff.find((u) => u && typeof u.name === "string" && u.name.toLowerCase().includes("sushobhit")) ||
            displayStaff[0] ||
            null;
      setSelectedUser(defaultStaff);
    }
  }, [displayStaff, currentUser, selectedUser]);

  // Listen to physical keyboard events for rapid PIN entry
  useEffect(() => {
    if (!isAuthModalOpen && currentUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if in staff mode
      if (mode === "staff" && selectedUser) {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          handleKeypadPress(e.key);
        } else if (e.key === "Backspace") {
          e.preventDefault();
          handleDeleteDigit();
        } else if (e.key === "Escape" && currentUser) {
          setIsAuthModalOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, selectedUser, pin, isAuthModalOpen, currentUser]);

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
        verifyStaffPin(selectedUser.id, newPin);
      }
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  const verifyStaffPin = (userId: string, pinToTest: string) => {
    setIsLoading(true);
    setTimeout(() => {
      const success = loginWithPin(userId, pinToTest);
      setIsLoading(false);
      if (!success) {
        setErrorMsg("Incorrect 4-digit PIN. Please try again.");
        setPin("");
      }
    }, 150);
  };

  const handleVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!visitorEmail || !visitorEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!visitorPin || visitorPin.length < 4) {
      setErrorMsg("Please enter a 4-digit PIN.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = loginWithEmailAndPin(visitorEmail, visitorPin);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.error || "Login failed.");
      }
    }, 200);
  };

  // If already logged in and modal isn't explicitly forced open, don't show
  if (currentUser && !isAuthModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950/95 p-5 sm:p-7 shadow-2xl overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-purple-600/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-pink-600/20 blur-3xl pointer-events-none" />

        {/* Close button ONLY if user is already logged in (can cancel profile switch) */}
        {currentUser && (
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
            title="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* BRAND HEADER */}
        <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-800/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-purple-600/30 mb-2.5">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
              <Scissors className="h-6 w-6 text-purple-400 transform -rotate-45" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {settings.salon_name}
            <Sparkles className="h-4 w-4 text-amber-400" />
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {currentUser ? "Switch staff profile or log in with credentials" : "Enter credentials to access Salon POS & Billing Suite"}
          </p>
        </div>

        {/* CURRENT SESSION BAR (IF LOGGED IN) */}
        {currentUser && (
          <div className="mt-3 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white"
                style={{ backgroundColor: currentUser.avatar_color }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-xs">
                <span className="text-zinc-400">Current: </span>
                <strong className="text-white">{currentUser.name}</strong>{" "}
                <span className="text-[10px] text-purple-300">({currentUser.role})</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* MODE SELECTOR TABS */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800/80 my-4">
          <button
            type="button"
            onClick={() => {
              setMode("staff");
              setErrorMsg("");
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              mode === "staff"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Staff PIN Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("visitor");
              setErrorMsg("");
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              mode === "visitor"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Visitor / Email Login</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: STAFF PIN LOGIN (SUSHOBHIT & AMIT)
            ========================================================================= */}
        {mode === "staff" && (
          <div>
            <div className="mb-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                Select Profile:
              </label>

              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {displayStaff.map((user) => {
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
                        className="flex h-10 w-10 items-center justify-center rounded-xl font-extrabold text-sm text-white mb-1.5 shadow-inner"
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

            {/* KEYPAD & PIN INDICATOR */}
            {selectedUser && (
              <div className="pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-zinc-400">
                    Staff: <strong className="text-white">{selectedUser.name}</strong>
                  </div>
                  <div className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-purple-400" />
                    <span>Enter 4-digit PIN</span>
                  </div>
                </div>

                {/* PIN DOTS */}
                <div className="flex justify-center items-center gap-3 my-2.5">
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
                      className="h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-purple-600 active:text-white border border-zinc-800 text-white font-mono font-bold text-base transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPin("")}
                    className="h-10 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-purple-600 active:text-white border border-zinc-800 text-white font-mono font-bold text-base transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteDigit}
                    className="h-10 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
                    title="Backspace"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: VISITOR / EMAIL + PIN LOGIN
            ========================================================================= */}
        {mode === "visitor" && (
          <form onSubmit={handleVisitorSubmit} className="space-y-3.5 py-1">
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-purple-400" />
                <span>Work or Visitor Email Address</span>
              </label>
              <Input
                type="email"
                required
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="e.g. visitor@example.com or your email"
                className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-purple-400" />
                <span>4-Digit Security PIN</span>
              </label>
              <Input
                type="password"
                required
                maxLength={4}
                value={visitorPin}
                onChange={(e) => setVisitorPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="•••• (4 digits)"
                className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl text-center font-mono text-base tracking-widest"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200">
              <div className="flex items-center gap-1.5 font-bold text-purple-300 mb-1">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Visitor & Guest Access</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                First time visitor? Simply enter your email and set any 4-digit PIN to explore all billing, catalog, and receptionist features.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 text-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? "Unlocking Suite..." : "Sign In & Unlock App"}</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

