import { z } from "zod"

// Email validation schema
export const emailSchema = z.string().email("Please enter a valid email address").optional().or(z.literal(""))

// Phone validation schema - 10 digits or international format (+ and at least 11 digits)
export const phoneSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true // Allow empty strings (for optional)

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
  )
  .optional()
  .or(z.literal(""))

// Name validation schema
export const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters")

// Contact validation - require at least one contact method
export const contactValidation = (obj: z.AnyZodObject) =>
  obj.refine((data: any) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["contact"],
  })

// Notification preferences validation - require at least one notification type
export const notificationPreferencesValidation = (obj: z.AnyZodObject) =>
  obj.refine(
    (data: any) => data.notifyOpenPlay || data.notifyTournaments || data.notifyPopUps || data.notifySpecialEvents,
    {
      message: "At least one notification type must be selected",
      path: ["notifications"],
    },
  )

// Notification signup schema
const baseNotificationSignupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  notifyOpenPlay: z.boolean().optional().default(false),
  notifyTournaments: z.boolean().optional().default(false),
  notifyPopUps: z.boolean().optional().default(false),
  notifySpecialEvents: z.boolean().optional().default(false),
});

export const notificationSignupSchema = contactValidation(
  notificationPreferencesValidation(baseNotificationSignupSchema) as unknown as z.AnyZodObject
);

export type NotificationSignupData = z.infer<typeof notificationSignupSchema>

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ""

  // Remove all non-digit characters except the + sign
  const digitsOnly = phone.replace(/[^\d+]/g, "")

  // If it's an international number (starts with +), return as is
  if (digitsOnly.startsWith("+")) {
    return digitsOnly
  }

  // Format US number: (XXX) XXX-XXXX
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
  }

  // Return as is if it doesn't match expected formats
  return phone
}

// Helper function to parse boolean values from form data
export function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (!value) return false
  return value === "true" || value === "on"
}
