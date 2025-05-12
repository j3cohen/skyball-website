"use server"

import { z } from "zod"
import {
  notificationSignupSchema,
  parseBoolean,
  formatPhoneNumber,
  type NotificationSignupData,
} from "@/lib/validations"

// Add environment variables debug logging
console.log("Environment variables check for open-play-notifications:", {
  hasTelegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
  hasTelegramChatId: !!process.env.TELEGRAM_CHAT_ID,
  // Print first few characters to verify content without exposing full token
  tokenPrefix: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 4) + "..." : "not set",
  chatIdPrefix: process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.substring(0, 2) + "..." : "not set",
})

export async function subscribeToOpenPlayNotifications(formData: FormData) {
  try {
    // Extract data from the form
    const data = {
      name: (formData.get("name") as string) || "",
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || "",
      notifyOpenPlay: parseBoolean(formData.get("notifyOpenPlay")),
      notifyTournaments: parseBoolean(formData.get("notifyTournaments")),
      notifyPopUps: parseBoolean(formData.get("notifyPopUps")),
      notifySpecialEvents: parseBoolean(formData.get("notifySpecialEvents")),
    }

    console.log("Processing Open Play notification signup:", data)

    // Validate the data
    try {
      const validatedData = notificationSignupSchema.parse(data)

      // Send Telegram notification
      console.log("Sending Telegram notification for Open Play signup...")
      const success = await sendTelegramNotification(validatedData)

      if (success) {
        console.log("Telegram notification sent successfully")
        return {
          success: true,
          message: "You've been signed up for SkyBall notifications!",
        }
      } else {
        // If Telegram notification fails, log error but still return success to user
        console.error("Failed to send Telegram notification")
        return {
          success: true, // Still return success to user
          message: "You've been signed up for SkyBall notifications!",
        }
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const fieldErrors = validationError.errors.reduce(
          (acc, err) => {
            const field = err.path[0] as string
            if (!acc[field]) {
              acc[field] = []
            }
            acc[field].push(err.message)
            return acc
          },
          {} as Record<string, string[]>,
        )

        return {
          success: false,
          message: "Please check your information and try again.",
          fieldErrors,
        }
      }

      console.error("Validation error:", validationError)
      return {
        success: false,
        message: "We couldn't process your information. Please try again later.",
      }
    }
  } catch (error) {
    console.error("Open Play notification signup error:", error)
    return {
      success: false,
      message: "We're experiencing technical difficulties. Please try again later.",
    }
  }
}

async function sendTelegramNotification(data: NotificationSignupData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    // Additional debug logging inside the function
    console.log("Telegram credentials check inside sendTelegramNotification:", {
      hasBotToken: !!botToken,
      hasChatId: !!chatId,
      botTokenLength: botToken ? botToken.length : 0,
      chatIdLength: chatId ? chatId.length : 0,
    })

    if (!botToken || !chatId) {
      console.error("Missing Telegram credentials:", {
        hasBotToken: !!botToken,
        hasChatId: !!chatId,
      })
      return false
    }

    // Format phone number for display
    const formattedPhone = data.phone ? formatPhoneNumber(data.phone) : ""

    // Create notification preferences section
    const notificationTypes = []
    if (data.notifyOpenPlay) notificationTypes.push("✅ Open Play Sessions")
    if (data.notifyPopUps) notificationTypes.push("✅ Pop-up Events")
    if (data.notifyTournaments) notificationTypes.push("✅ Tournaments")
    if (data.notifySpecialEvents) notificationTypes.push("✅ Special Events")

    // Format the message
    const message = `
🏐 *New SkyBall Notification Signup* 🏐

*Contact Information:*
${data.name ? `*Name:* ${data.name}` : ""}
${data.email ? `*Email:* ${data.email}` : ""}
${formattedPhone ? `*Phone:* ${formattedPhone}` : ""}

*Notification Preferences:*
${notificationTypes.join("\n")}

_Submitted at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern_`

    console.log("Attempting to send Telegram notification to:", chatId)

    // Send the message to Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Telegram API error:", errorData)
      return false
    }

    const result = await response.json()
    console.log("Telegram API response:", result)
    return result.ok
  } catch (error) {
    console.error("Error sending Telegram notification:", error)
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    return false
  }
}
