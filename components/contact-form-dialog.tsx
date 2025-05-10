"use client"

import type React from "react"

import { useState } from "react"
import { ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { submitInfoRequest } from "@/app/actions/info-request"

export function ContactFormDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<{
    success?: boolean
    message?: string
    fieldErrors?: Record<string, string[]>
  } | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setResponse(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.append("subject", "General Information Request")

    try {
      const result = await submitInfoRequest(formData)
      setResponse(result)

      if (result.success) {
        form.reset()
        // Close the dialog after 2 seconds on success
        setTimeout(() => {
          setOpen(false)
          setResponse(null)
        }, 2000)
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      setResponse({
        success: false,
        message: "Something went wrong. Please try again later or email info@skyball.us.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-md bg-sky-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-950 disabled:pointer-events-none disabled:opacity-50"
      >
        Contact Us
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Contact SkyBall™</DialogTitle>
            <DialogDescription>
              Fill out the form below and we'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
              {response?.fieldErrors?.name && <p className="text-sm text-red-500">{response.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
              {response?.fieldErrors?.email && <p className="text-sm text-red-500">{response.fieldErrors.email[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" name="phone" type="tel" />
              {response?.fieldErrors?.phone && <p className="text-sm text-red-500">{response.fieldErrors.phone[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" name="location" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea id="message" name="message" rows={3} />
            </div>

            {response?.fieldErrors?.contact && (
              <p className="text-sm text-red-500">{response.fieldErrors.contact[0]}</p>
            )}

            <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>

            {response && (
              <div
                className={`p-3 rounded-md ${response.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {response.message}
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
