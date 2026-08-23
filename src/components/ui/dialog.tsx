"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
  maxWidth = "lg",
}: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Card */}
      <div
        className={cn(
          "relative z-50 w-full rounded-2xl border border-zinc-700/70 bg-zinc-900/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto",
          maxWidthClasses[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4 border-b border-zinc-800", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-xl font-bold tracking-tight text-white", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-zinc-400", className)}>
      {children}
    </p>
  );
}

export function DialogFooter({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-zinc-800 mt-6",
        className
      )}
    >
      {children}
    </div>
  );
}
