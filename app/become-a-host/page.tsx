import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPinIcon, UsersIcon, TrophyIcon } from "lucide-react"

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
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8">Become a SkyBall Host</h1>
          <p className="text-center mb-12 max-w-2xl mx-auto">
            Hosting a SkyBall tournament is a great way to grow the sport in your community and create exciting events
            for players. Follow these steps to organize your own tournament.
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
          <div className="text-center">
            <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white">
              Email play@skyball.us for more information!
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

