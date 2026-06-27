import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-gray-900 text-white hover:bg-gray-700": variant === "default",
            "border border-gray-200 bg-white hover:bg-gray-50 text-gray-900": variant === "outline",
            "hover:bg-gray-100 text-gray-900": variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600": variant === "destructive",
          },
          {
            "h-10 py-2 px-4 text-sm": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
