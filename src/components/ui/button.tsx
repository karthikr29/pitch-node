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
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer relative",
          // Variants with AWS Orange glow in dark mode
          variant === "default" &&
            "bg-primary text-text-on-primary shadow-lg hover:shadow-xl hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] dark:shadow-primary/30 dark:hover:shadow-primary/50 dark:hover:shadow-2xl",
          variant === "secondary" &&
            "bg-secondary text-white shadow-lg hover:shadow-xl hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] dark:shadow-secondary/30 dark:hover:shadow-secondary/50 dark:hover:shadow-2xl",
          variant === "outline" &&
            "border-2 border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary dark:hover:shadow-lg dark:hover:shadow-primary/30",
          variant === "ghost" &&
            "bg-transparent text-text-primary hover:bg-primary/10 dark:hover:bg-primary/20",
          variant === "destructive" &&
            "bg-error text-white shadow-lg hover:shadow-xl hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] dark:shadow-error/30 dark:hover:shadow-error/50",
          // Sizes
          size === "sm" && "h-9 px-4 text-xs",
          size === "default" && "h-11 px-6",
          size === "lg" && "h-14 px-8 text-base gap-2",
          size === "icon" && "h-10 w-10",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
