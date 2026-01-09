"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  sublabel?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, sublabel, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block font-display text-2xl md:text-3xl font-bold text-text-primary mb-2"
          >
            {label}
          </label>
        )}
        {sublabel && (
          <p className="text-text-secondary text-base md:text-lg mb-6">
            {sublabel}
          </p>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            // Base styles
            "w-full bg-transparent text-xl md:text-2xl text-text-primary",
            "border-b-2 border-border pb-3",
            "placeholder:text-text-muted",
            "transition-colors duration-200",
            // Focus state - no outline, just border color change
            "focus:outline-none focus:ring-0 focus:border-primary",
            "focus-visible:outline-none focus-visible:ring-0",
            // Error state
            error && "border-error focus:border-error",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${id}-error`}
            className="mt-2 text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
