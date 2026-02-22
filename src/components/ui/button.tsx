import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A0A0B]",
  {
    variants: {
      variant: {
        default:
          "bg-[#D97706] text-white hover:bg-[#F59E0B] active:bg-[#B45309]",
        destructive:
          "bg-[#DC2626] text-white hover:bg-[#DC2626]/90 active:bg-[#DC2626]/80",
        outline:
          "border border-[rgba(168,162,158,0.15)] bg-transparent text-[#F5F5F4] hover:bg-[rgba(217,119,6,0.1)] hover:text-[#D97706] hover:border-[#D97706]",
        secondary:
          "bg-[#1C1C1F] text-[#F5F5F4] hover:bg-[#141416] border border-[rgba(168,162,158,0.1)]",
        ghost:
          "text-[#A8A29E] hover:bg-[rgba(217,119,6,0.1)] hover:text-[#D97706]",
        link: "text-[#D97706] underline-offset-4 hover:underline hover:text-[#F59E0B]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        xl: "h-12 px-8 text-base font-semibold",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
