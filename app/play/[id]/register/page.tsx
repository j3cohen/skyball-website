"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { events } from "@/data/events"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import Link from "next/link"
import { submitEventRegistration } from "@/app/actions/event-registration"

type ResponseState = {
  success?: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  errorCode?: string
  isSystemError?: boolean
} | null

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const event = events.find((e) => e.id === params.id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<ResponseState>(null)

  // If event is not found, show 404 page
  if (!event) {
    notFound()
  }

  // Event details
  const eventId = event.id
  const eventName = event.name
  const eventType = event.type
  const isRSVP = eventType === "open-play"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setResponse(null)

    try {
      // Get form data
      const formData = new FormData(e.currentTarget)
      // Add event details to form data
      formData.append("eventId", eventId)
      formData.append("eventName", eventName)
      formData.append("eventType", eventType)

      // Submit the registration
      const result = await submitEventRegistration(formData)

      if (result.success) {
        setResponse({
          success: true,
          message: result.message,
        })

        // Reset form if successful
        if (e.currentTarget) {
          e.currentTarget.reset()
        }

        // Redirect after successful submission after showing success message
        setTimeout(() => {
          // Make sure event exists before accessing its id
          if (event) {
            router.push(`/play/${event.id}`)
          } else {
            // Fallback to the play page if event is somehow undefined
            router.push("/play")
          }
        }, 3000)
      } else {
        setResponse({
          success: false,
          message: result.message,
          fieldErrors: result.fieldErrors,
          errorCode: result.errorCode,
          isSystemError: result.isSystemError,
        })
      }
    } catch (error) {
      // Log the error for debugging
      console.error("Error submitting form:", error)

      // Show a generic error message to the user
      setResponse({
        success: false,
        message:
          "We're experiencing technical difficulties. Please email info@skyball.us to register or try again later.",
        errorCode: "UNKNOWN_ERROR",
        isSystemError: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Custom date input component with auto-advancing
  function DateInput({ setResponse }: { setResponse: React.Dispatch<React.SetStateAction<ResponseState>> }) {
    const monthRef = useRef<HTMLInputElement>(null)
    const dayRef = useRef<HTMLInputElement>(null)
    const yearRef = useRef<HTMLInputElement>(null)
    const hiddenDateRef = useRef<HTMLInputElement>(null)

    // Update the hidden input whenever month, day, or year changes
    const updateHiddenDate = () => {
      if (!monthRef.current || !dayRef.current || !yearRef.current || !hiddenDateRef.current) return

      const month = monthRef.current.value.padStart(2, "0")
      const day = dayRef.current.value.padStart(2, "0")
      const year = yearRef.current.value

      if (month && day && year && year.length === 4) {
        hiddenDateRef.current.value = `${year}-${month}-${day}`
      } else {
        hiddenDateRef.current.value = ""
      }
    }

    // Handle input for month, day, and year fields
    const handleInput = (
      e: React.ChangeEvent<HTMLInputElement>,
      maxLength: number,
      nextRef?: React.RefObject<HTMLInputElement>,
    ) => {
      const input = e.target
      const value = input.value

      // Only allow numbers
      if (!/^\d*$/.test(value)) {
        input.value = value.replace(/\D/g, "")
        return
      }

      // Auto-advance to next field when max length is reached
      if (value.length === maxLength && nextRef?.current) {
        nextRef.current.focus()
      }

      // Update the hidden date input
      updateHiddenDate()

      // Clear any error messages when user is typing
      setResponse((prev) => {
        if (!prev) return prev

        // Create a new object without the dob field error
        const newFieldErrors = { ...prev.fieldErrors }
        if (newFieldErrors && "dob" in newFieldErrors) {
          delete newFieldErrors.dob
        }

        return {
          ...prev,
          fieldErrors: newFieldErrors,
        }
      })
    }

    return (
      <>
        <div className="flex items-center gap-2">
          <Input
            ref={monthRef}
            type="text"
            id="dob-month"
            placeholder="MM"
            maxLength={2}
            className="w-16 text-center"
            onChange={(e) => handleInput(e, 2, dayRef)}
            aria-label="Month"
          />
          <span className="text-gray-500">/</span>
          <Input
            ref={dayRef}
            type="text"
            id="dob-day"
            placeholder="DD"
            maxLength={2}
            className="w-16 text-center"
            onChange={(e) => handleInput(e, 2, yearRef)}
            aria-label="Day"
          />
          <span className="text-gray-500">/</span>
          <Input
            ref={yearRef}
            type="text"
            id="dob-year"
            placeholder="YYYY"
            maxLength={4}
            className="w-24 text-center"
            onChange={(e) => handleInput(e, 4)}
            aria-label="Year"
          />
        </div>
        {/* Hidden input that will be submitted with the form */}
        <input ref={hiddenDateRef} type="date" id="dob" name="dob" required className="hidden" />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <Link href={`/play/${event.id}`} className="text-sky-600 hover:text-sky-800">
                ← Back to event details
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {isRSVP ? "RSVP" : "Register"} for {event.name}
              </h1>
              <p className="text-gray-600 mb-6">
                {event.date} • {event.location}
              </p>

              {response && (
                <div
                  className={`mb-6 p-4 rounded-md ${
                    response.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  <p className="mb-2">{response.message}</p>
                  {!response.success && response.isSystemError && (
                    <p className="text-sm">
                      If you continue to experience issues, please email{" "}
                      <a href="mailto:info@skyball.us" className="underline font-medium">
                        info@skyball.us
                      </a>{" "}
                      with your registration details.
                    </p>
                  )}
                  {response.success && (
                    <p className="text-sm">Redirecting you back to the event page in a few seconds...</p>
                  )}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className={`mt-1 ${response?.fieldErrors?.name ? "border-red-500" : ""}`}
                  />
                  {response?.fieldErrors?.name && (
                    <p className="mt-1 text-sm text-red-600">{response.fieldErrors.name[0]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className={`mt-1 ${response?.fieldErrors?.email ? "border-red-500" : ""}`}
                  />
                  {response?.fieldErrors?.email && (
                    <p className="mt-1 text-sm text-red-600">{response.fieldErrors.email[0]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    className={`mt-1 ${response?.fieldErrors?.phone ? "border-red-500" : ""}`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a 10-digit number (e.g., 5551234567) or international format with + (e.g., +1 555-123-4567)
                  </p>
                  {response?.fieldErrors?.phone && (
                    <p className="mt-1 text-sm text-red-600">{response.fieldErrors.phone[0]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="dob-month" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="flex gap-2 mt-1">
                    <DateInput setResponse={setResponse} />
                  </div>
                  {response?.fieldErrors?.dob && (
                    <p className="mt-1 text-sm text-red-600">{response.fieldErrors.dob[0]}</p>
                  )}
                </div>

                {/* Tournament-specific fields removed as requested */}

                {event.skillLevel && (
                  <div>
                    <label htmlFor="skill-level" className="block text-sm font-medium text-gray-700">
                      Your Skill Level
                    </label>
                    <select
                      id="skill-level"
                      name="skill-level"
                      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                        response?.fieldErrors?.skillLevel ? "border-red-500" : ""
                      }`}
                      required
                    >
                      <option value="">Select your skill level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    {response?.fieldErrors?.skillLevel && (
                      <p className="mt-1 text-sm text-red-600">{response.fieldErrors.skillLevel[0]}</p>
                    )}
                  </div>
                )}

                {event.registrationFee && (
                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                    <h3 className="font-medium text-yellow-800 mb-2">Payment Instructions</h3>
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Important:</strong> Your registration is not confirmed until payment is received.
                    </p>
                    <p className="text-sm text-yellow-800 mb-2">Please send your payment to one of the following:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-800 mb-2">
                      <li>PayPal: jbc@jbcventures.xyz</li>
                      <li>Zelle: jbc@jbcventures.xyz</li>
                      <li>Venmo: @jbcventures</li>
                    </ul>
                    <p className="text-sm text-yellow-800">
                      Once payment is received, we will reach out to confirm your spot in the event.
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : isRSVP ? "Confirm RSVP" : "Complete Registration"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
