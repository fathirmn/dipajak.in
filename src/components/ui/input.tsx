import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles - underline input
        "h-9 w-full min-w-0 bg-transparent px-0 py-2 text-[15px] text-[#F5F5F4]",
        "border-0 border-b border-[rgba(168,162,158,0.15)]",
        "placeholder:text-[#78716C]",
        "transition-colors duration-150 outline-none",
        // Focus state - copper underline
        "focus:border-[#D97706]",
        // Selection
        "selection:bg-[#D97706] selection:text-white",
        // File input
        "file:text-[#F5F5F4] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid state
        "aria-invalid:border-[#DC2626]",
        className
      )}
      {...props}
    />
  )
}

// Boxed variant for specific use cases
function InputBoxed({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 bg-[#141416] px-3 py-2 text-[15px] text-[#F5F5F4]",
        "border border-[rgba(168,162,158,0.15)]",
        "placeholder:text-[#78716C]",
        "transition-colors duration-150 outline-none",
        "focus:border-[#D97706]",
        "selection:bg-[#D97706] selection:text-white",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[#DC2626]",
        className
      )}
      {...props}
    />
  )
}

export { Input, InputBoxed }
