"use server"

import { z } from "zod"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(1, "Message is required"),
  zip: z.string().min(5, "Zip code must be at least 5 characters").max(10, "Zip code must be at most 10 characters"),
})

export async function submitContactForm(formData: FormData) {
  const validatedFields = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
    zip: formData.get("zip"),
  })

  if (!validatedFields.success) {
    return { success: false, errors: validatedFields.error.flatten().fieldErrors }
  }

  // Here you would typically send an email or save to a database
  // For now, we'll just log the data and return a success message
  console.log("Form data:", validatedFields.data)

  return { success: true, message: "Thank you for your message. We'll get back to you soon!" }
}

