// components/ui/select.tsx
"use client"

import * as React from "react"
import * as SelectPrimitives from "@radix-ui/react-select"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"

const Select = SelectPrimitives.Root

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitives.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitives.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitives.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitives.Icon>
  </SelectPrimitives.Trigger>
))
SelectTrigger.displayName = SelectPrimitives.Trigger.displayName

const SelectValue = SelectPrimitives.Value

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitives.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitives.Portal>
    <SelectPrimitives.Content
      ref={ref}
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-popover bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
        className
      )}
      {...props}
    >
      <SelectPrimitives.Viewport className="p-1">{children}</SelectPrimitives.Viewport>
    </SelectPrimitives.Content>
  </SelectPrimitives.Portal>
))
SelectContent.displayName = SelectPrimitives.Content.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitives.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitives.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-8 py-2 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <SelectPrimitives.ItemText>{children}</SelectPrimitives.ItemText>
    <SelectPrimitives.ItemIndicator className="absolute left-2 inline-flex items-center">
      <Check className="h-4 w-4" />
    </SelectPrimitives.ItemIndicator>
  </SelectPrimitives.Item>
))
SelectItem.displayName = SelectPrimitives.Item.displayName

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
