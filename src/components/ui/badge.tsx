import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "purple";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-zinc-800 text-zinc-200 border-zinc-700",
    secondary: "bg-zinc-900 text-zinc-400 border-zinc-800",
    outline: "border-zinc-700 text-zinc-300",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    destructive: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
