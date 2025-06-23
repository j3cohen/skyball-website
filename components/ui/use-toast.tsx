// /components/ui/use-toast.ts
import { useCallback } from "react"
import { toast as sonnerToast } from "sonner"

export function useToast() {
  // 'sonner' does not provide a 'dismiss' function via a hook, so we omit it
  const toast = useCallback(
    (props: {
      title: string
      description?: string
      variant?: "default" | "destructive" | "success"
      duration?: number
    }) => {
      // Map 'destructive' to 'error', otherwise use the correct method
      if (props.variant === "success") {
        sonnerToast.success(props.title, {
          description: props.description,
          duration: props.duration ?? 3000,
        })
      } else if (props.variant === "destructive") {
        sonnerToast.error(props.title, {
          description: props.description,
          duration: props.duration ?? 3000,
        })
      } else {
        sonnerToast(props.title, {
          description: props.description,
          duration: props.duration ?? 3000,
        })
      }
    },
    []
  )

  return { toast }
}

// Optional default export for convenience
export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    sonnerToast.success(title, { description, duration }),
  error: (title: string, description?: string, duration?: number) =>
    sonnerToast.error(title, { description, duration }),
  info: (title: string, description?: string, duration?: number) =>
    sonnerToast.message(title, { description, duration }),
  default: (title: string, description?: string, duration?: number) =>
    sonnerToast(title, { description, duration }),
}
