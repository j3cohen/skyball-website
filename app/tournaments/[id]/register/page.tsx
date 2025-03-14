"use client"

import type React from "react"

import { useState, useRef } from "react"
import { upcomingTournaments } from "@/data/tournaments"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { submitRegistration } from "@/app/actions/registration"

type ResponseState = {
  success?: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  isSystemError?: boolean
} | null

export default function TournamentRegistrationPage({ params }: { params: { id: string } }) {
  const tournament = upcomingTournaments.find((t) => t.id === params.id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<ResponseState>(null)

  // If tournament is not found, show 404 page
  if (!tournament) {
    notFound()
  }

  // TypeScript non-null assertion to tell TypeScript that tournament is definitely not null at this point
  const tournamentId = tournament!.id

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setResponse(null)

    try {
      // Get form data
      const formData = new FormData(event.currentTarget)
      // Add tournament ID to form data
      formData.append("tournamentId", tournamentId)

      // Submit the registration
      const result = await submitRegistration(formData)

      if (result.success) {
        setResponse({
          success: true,
          message: result.message,
        })

        // Reset form if successful
        if (event.currentTarget) {
          event.currentTarget.reset()
        }
      } else {
        setResponse({
          success: false,
          message: result.message,
          fieldErrors: result.fieldErrors,
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
      setResponse((prev) => (prev ? { ...prev, fieldErrors: { ...prev.fieldErrors, dob: null } } : prev))
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
          <h1 className="text-3xl font-bold mb-8">Register for {tournament.name}</h1>
          <div className="bg-white rounded-xl shadow-lg p-8">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Fee: {tournament.registrationFee}
                </label>
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <h3 className="font-medium text-yellow-800 mb-2">Payment Instructions</h3>
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>Important:</strong> Your registration is not confirmed until payment is received.
                  </p>
                  <p className="text-sm text-yellow-800 mb-2">Please send your payment to one of the following:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-800 mb-2">
                    <li>PayPal: jbc@jbcventures.xyz</li>
                    <li>Zelle: jb@jbcventures.xyz</li>
                  </ul>
                  <p className="text-sm text-yellow-800">
                    Once payment is received, we will reach out to confirm your spot in the tournament.
                  </p>
                </div>
              </div>
              <div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Registering..." : "Register for Tournament"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

