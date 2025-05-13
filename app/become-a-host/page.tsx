"use client"

import { useState } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPinIcon, UsersIcon, TrophyIcon } from "lucide-react"
import InfoRequestForm from "@/components/info-request-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Become a Host",
  description: "Learn how to host a SkyBall tournament in your community.",
  openGraph: {
    title: "Become a Host",
    description: "Learn how to host a SkyBall tournament in your community.",
    url: "https://skyball.com/become-a-host",
  },
}

const steps = [
  {
    icon: CalendarIcon,
    title: "Choose a Date",
    description: "Select a date for your tournament, considering local events and weather conditions.",
  },
  {
    icon: MapPinIcon,
    title: "Secure a Venue",
    description: "Find and book a suitable venue with the right number of courts for your expected participants.",
  },
  {
    icon: UsersIcon,
    title: "Recruit Participants",
    description: "Promote your tournament to local SkyBall players and sports enthusiasts.",
  },
  {
    icon: TrophyIcon,
    title: "Organize the Event",
    description: "Plan the tournament structure, arrange for equipment, and prepare awards for winners.",
  },
]

export default function BecomeAHostPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8">Become a SkyBall Host</h1>
          <p className="text-center mb-12 max-w-2xl mx-auto">
            Hosting a SkyBall tournament is a great way to grow the sport in your community and create exciting events
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {steps.map((step, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md flex items-start">
                <div className="mr-4">
                  <step.icon className="w-8 h-8 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Partner With Us</h2>
            <p className="mb-4">
              At SkyBall, we believe in building strong partnerships with our hosts. We&apos;re dedicated to making your
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>Provide marketing support to promote your events</li>
              <li>Offer guidance on tournament structure and organization</li>
              <li>Connect you with the broader SkyBall community</li>
              <li>Help you build a sustainable local SkyBall presence</li>
            </ul>
            <div className="text-center">
              <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white" onClick={() => setShowForm(true)}>
                Find Out More
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {showForm && <InfoRequestForm subject="Host Information Request" onClose={() => setShowForm(false)} />}
    </>
  )
}

