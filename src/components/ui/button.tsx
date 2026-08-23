import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "accent" | "glow";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer rounded-xl";

    const variants = {
      default: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25",
      secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60",
      outline: "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-200",
      ghost: "bg-transparent hover:bg-zinc-800/60 text-zinc-300 hover:text-white",
      destructive: "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30",
      accent: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-pink-600/20",
      glow: "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_25px_rgba(139,92,246,0.7)]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base font-semibold gap-2.5",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
