"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type NotificationType = "success" | "error" | "info"

interface NotificationMessage {
  type: NotificationType
  title: string
  message: string
}

export function DashboardNotifications() {
  const [notification, setNotification] = useState<NotificationMessage | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success parameters in URL
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")
    const action = searchParams.get("action") || "purchase"

    if (success === "1") {
      // Handle different success actions
      if (action === "purchase") {
        setNotification({
          type: "success",
          title: "Purchase Successful!",
          message: "Your tournament pass has been purchased successfully. It's now available in your account.",
        })
      } else if (action === "registration") {
        setNotification({
          type: "success",
          title: "Registration Complete!",
          message: "You have successfully registered for the tournament.",
        })
      } else if (action === "profile") {
        setNotification({
          type: "success",
          title: "Profile Updated",
          message: "Your profile information has been updated successfully.",
        })
      } else {
        setNotification({
          type: "success",
          title: "Success!",
          message: "Your action was completed successfully.",
        })
      }
    } else if (canceled === "1") {
      setNotification({
        type: "info",
        title: "Purchase Canceled",
        message: "Your purchase was canceled. No payment was processed.",
      })
    }
  }, [searchParams])

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  if (!notification) return null

  return (
    <Alert
      className={cn(
        "mb-6 animate-fadeIn relative",
        notification.type === "success" && "border-green-500 bg-green-50 text-green-800",
        notification.type === "error" && "border-red-500 bg-red-50 text-red-800",
        notification.type === "info" && "border-blue-500 bg-blue-50 text-blue-800",
      )}
    >
      <div className="absolute right-2 top-2">
        <button
          onClick={() => setNotification(null)}
          className="rounded-full p-1 hover:bg-black/5"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {notification.type === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
      {notification.type === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
      {notification.type === "info" && <AlertCircle className="h-5 w-5 text-blue-600" />}

      <AlertTitle className="ml-2">{notification.title}</AlertTitle>
      <AlertDescription className="ml-2">{notification.message}</AlertDescription>
    </Alert>
  )
}
