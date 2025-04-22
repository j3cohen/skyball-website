"use server"

import { z } from "zod"

// Add environment variables debug logging
console.log("Environment variables check for event registration:", {
  hasTelegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
  hasTelegramChatId: !!process.env.TELEGRAM_CHAT_ID,
  // Print first few characters to verify content without exposing full token
  tokenPrefix: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 4) + "..." : "not set",
  chatIdPrefix: process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.substring(0, 2) + "..." : "not set",
})

// Define validation schema for form data
const eventRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().refine(
    (val) => {
      // Remove all non-digit characters except the + sign
      const digitsOnly = val.replace(/[^\d+]/g, "")

      // Check if it's an international number (starts with +)
      if (digitsOnly.startsWith("+")) {
        // Must have at least 11 characters total (+ and at least 10 digits)
        return digitsOnly.length >= 11
      }
      // Otherwise it must have exactly 10 digits
      else {
        return digitsOnly.length === 10
      }
    },
    {
      message: "Phone number must be either 10 digits or international format starting with +",
    },
  ),
  dob: z.string().refine(
    (val) => {
      // Check if the date is valid
      const isValidDate = !isNaN(Date.parse(val))

      if (!isValidDate) return false

      // Check if the date is not in the future
      const dobDate = new Date(val)
      const today = new Date()
      return dobDate <= today
    },
    {
      message: "Please enter a valid date of birth (not in the future)",
    },
  ),
  teamName: z.string().optional(),
  partnerName: z.string().optional(),
  partnerEmail: z.string().email("Please enter a valid partner email address").optional(),
  skillLevel: z.string().optional(),
  eventId: z.string(),
  eventName: z.string(),
  eventType: z.string(),
})

type EventRegistrationData = z.infer<typeof eventRegistrationSchema>

export async function submitEventRegistration(formData: FormData) {
  try {
    // Extract data from the form
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      dob: formData.get("dob") as string,
      teamName: (formData.get("team-name") as string) || undefined,
      partnerName: (formData.get("partner-name") as string) || undefined,
      partnerEmail: (formData.get("partner-email") as string) || undefined,
      skillLevel: (formData.get("skill-level") as string) || undefined,
      eventId: formData.get("eventId") as string,
      eventName: formData.get("eventName") as string,
      eventType: formData.get("eventType") as string,
    }

    console.log(`Processing ${data.eventType === "open-play" ? "RSVP" : "registration"} for:`, data.name)

    // Validate the data
    try {
      const validatedData = eventRegistrationSchema.parse(data)

      // Send Telegram notification
      console.log("Sending Telegram notification...")
      const success = await sendTelegramNotification(validatedData)

      if (success) {
        console.log("Telegram notification sent successfully")
        return {
          success: true,
          message:
            data.eventType === "open-play"
              ? "RSVP confirmed! We look forward to seeing you at the event."
              : "Registration form submitted! Please complete your payment to secure your spot. Once payment is received, we will confirm your registration.",
        }
      } else {
        // If Telegram notification fails, return an error
        console.error("Failed to send Telegram notification")
        return {
          success: false,
          message:
            "We're experiencing technical difficulties. Please email info@skyball.us to register or try again later.",
          errorCode: "TELEGRAM_NOTIFICATION_FAILED",
          isSystemError: true,
        }
      }
    } catch (validationError) {
      // Handle validation errors separately
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

        // Create a user-friendly message
        return {
          success: false,
          message: "Please check your information and try again.",
          fieldErrors,
          errorCode: "VALIDATION_ERROR",
          isSystemError: false,
        }
      }

      // Re-throw if it's not a validation error
      throw validationError
    }
  } catch (error) {
    // Log the detailed error for debugging
    console.error("Event registration error:", error)

    // Generic error response for system errors
    return {
      success: false,
      message:
        "We're experiencing technical difficulties. Please email info@skyball.us to register or try again later.",
      errorCode: "UNKNOWN_ERROR",
      isSystemError: true,
    }
  }
}

async function sendTelegramNotification(data: EventRegistrationData) {
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

    // Format the message
    const isRSVP = data.eventType === "open-play"
    const message = `
🎾 *New ${isRSVP ? "RSVP" : "Registration"} for SkyBall Event* 🎾

*Event:* ${data.eventName}
*Event ID:* ${data.eventId}
*Event Type:* ${data.eventType}

*Participant Details:*
- Name: ${data.name}
- Email: ${data.email}
- Phone: ${data.phone}
- Date of Birth: ${data.dob}
${data.skillLevel ? `- Skill Level: ${data.skillLevel}` : ""}

${
  data.teamName || data.partnerName
    ? `*Team Information:*
${data.teamName ? `- Team Name: ${data.teamName}` : ""}
${data.partnerName ? `- Partner Name: ${data.partnerName}` : ""}
${data.partnerEmail ? `- Partner Email: ${data.partnerEmail}` : ""}`
    : ""
}

_${isRSVP ? "RSVP" : "Registration"} received at ${new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    })} Eastern_`

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

