"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          // Variants
          variant === "default" && "bg-primary text-text-on-primary shadow-sm hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]",
          variant === "secondary" && "bg-secondary text-white shadow-sm hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]",
          variant === "outline" && "border border-border bg-transparent text-text-primary hover:bg-surface",
          variant === "ghost" && "bg-transparent text-text-primary hover:bg-surface",
          variant === "destructive" && "bg-error text-white shadow-sm hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]",
          // Sizes
          size === "sm" && "h-9 px-4 text-sm",
          size === "default" && "h-11 px-5",
          size === "lg" && "h-12 px-8 text-base gap-2",
          size === "icon" && "h-10 w-10",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
