"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-white hover:brightness-110 active:brightness-95 shadow-lg shadow-accent/20",
  secondary: "bg-surface-2 text-foreground hover:bg-surface-2/70 border border-border",
  ghost: "bg-transparent text-foreground hover:bg-surface-2/60",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 rounded-xl",
  lg: "text-base px-6 py-3 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${variantClasses[variant]} ${sizeClasses[size]} font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-[0.98] ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
