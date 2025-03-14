"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import { submitInfoRequest } from "@/app/actions/info-request"

interface InfoRequestFormProps {
  subject: string
  onClose: () => void
  additionalFields?: React.ReactNode
}

export default function InfoRequestForm({ subject, onClose, additionalFields }: InfoRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<{
    success: boolean
    message: string
    fieldErrors?: Record<string, string[]>
  } | null>(null)
  const [emailOrPhoneError, setEmailOrPhoneError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Generic error handler that can be used throughout the component
  const handleError = useCallback((error: unknown, errorMessage?: string) => {
    console.error("Form error:", error)
    setResponse({
      success: false,
      message: "We&apos;re experiencing technical difficulties. Please email info@skyball.us or try again later.",
    })
    setIsSubmitting(false)
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setResponse(null)
      setEmailOrPhoneError(null)

      // Use FormData with the form reference instead of event.currentTarget
      const form = formRef.current
      if (!form) {
        handleError(new Error("Form reference is null"), "Form could not be processed. Please email info@skyball.us.")
        return
      }

      const formData = new FormData(form)
      const email = (formData.get("email") as string) || ""
      const phone = (formData.get("phone") as string) || ""

      // Client-side validation for email or phone
      if (!email && !phone) {
        setEmailOrPhoneError("Please provide either an email address or phone number")
        setIsSubmitting(false)
        return
      }

      formData.append("subject", subject)

      try {
        const result = await submitInfoRequest(formData)

        setResponse({
          success: result.success,
          message: result.message,
          fieldErrors: result.fieldErrors,
        })

        if (result.success) {
          try {
            // Reset form on success using the form reference
            form.reset()

            // Close the form after 3 seconds on success
            setTimeout(() => {
              onClose()
            }, 3000)
          } catch (resetError) {
            console.error("Error resetting form:", resetError)
            // Don't show an error to the user since the submission was successful
          }
        }
      } catch (submitError) {
        handleError(submitError)
      }
    } catch (error) {
      handleError(error)
    } finally {
      // Ensure isSubmitting is always set to false, even if there's an error
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Request Information</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {response && (
            <div
              className={`mb-4 p-3 rounded ${response.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              {response.message}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input id="name" name="name" required placeholder="Your name" />
              {response?.fieldErrors?.name && (
                <p className="mt-1 text-sm text-red-600">{response.fieldErrors.name[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input id="email" name="email" type="email" placeholder="Your email address" />
              {response?.fieldErrors?.email && (
                <p className="mt-1 text-sm text-red-600">{response.fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <Input id="phone" name="phone" type="tel" placeholder="Your phone number" />
              {response?.fieldErrors?.phone && (
                <p className="mt-1 text-sm text-red-600">{response.fieldErrors.phone[0]}</p>
              )}
            </div>

            {/* Display error if neither email nor phone is provided */}
            {emailOrPhoneError && <div className="text-sm text-red-600">{emailOrPhoneError}</div>}

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                City, State
              </label>
              <Input id="location" name="location" placeholder="e.g., Brooklyn, NY" />
            </div>

            {additionalFields}

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message (Optional)
              </label>
              <Textarea id="message" name="message" placeholder="Any additional information or questions" rows={3} />
            </div>

            <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

