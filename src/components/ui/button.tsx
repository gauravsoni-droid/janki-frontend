/**
 * Button component (shadcn/ui style).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "cursor-pointer active:scale-95",
          {
            "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800":
              variant === "default",
            "border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100":
              variant === "outline",
            "hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200": variant === "ghost",
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3 text-sm": size === "sm",
            "h-11 px-8": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

