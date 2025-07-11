"use client"

import { Button } from "@/components/ui/button"
import { ExternalLink } from 'lucide-react'

interface GuestRegistrationButtonProps {
  paymentLink: string
}

export default function GuestRegistrationButton({ paymentLink }: GuestRegistrationButtonProps) {
  const handleGuestRegistration = () => {
    window.open(paymentLink, "_blank")
  }

  return (
    <div className="mt-4">
      <Button
        onClick={handleGuestRegistration}
        variant="outline"
        className="w-full border-sky-600 text-sky-600 hover:bg-sky-50 bg-transparent"
      >
        Register as Guest
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
      <p className="text-sm text-gray-600 mt-2 text-center">Quick registration without creating an account</p>
    </div>
  )
}
