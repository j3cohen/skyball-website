import { pastTournaments } from "@/data/tournaments"
import { notFound } from "next/navigation"
import Image from "next/image"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { CalendarIcon, MapPinIcon, TrophyIcon, Award, DollarSign, Star } from "lucide-react"

export default function PastTournamentPage({ params }: { params: { id: string } }) {
  const tournament = pastTournaments.find((t) => t.id === params.id)

  if (!tournament) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">{tournament.name}</h1>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Tournament Details</h2>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-sky-600" />
                    <span>{tournament.date}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPinIcon className="w-5 h-5 mr-2 text-sky-600" />
                    <span>{tournament.location}</span>
                  </div>
                  <div className="flex items-center">
                    <TrophyIcon className="w-5 h-5 mr-2 text-sky-600" />
                    <span>Winner: {tournament.winner}</span>
                  </div>
                  <div className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-sky-600" />
                    <span>Runner-up: {tournament.runnerUp}</span>
                  </div>
                  {tournament.prizePool && (
                    <div className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-sky-600" />
                      <span>Prize Pool: {tournament.prizePool}</span>
                    </div>
                  )}
                  {tournament.pointsAwarded && (
                    <div className="flex items-center">
                      <Star className="w-5 h-5 mr-2 text-sky-600" />
                      <span>Points Awarded: {tournament.pointsAwarded}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Tournament Bracket</h2>
                <Image
                  src={tournament.bracket || "/placeholder.svg"}
                  alt={`${tournament.name} Bracket`}
                  width={500}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Tournament Description</h2>
              <p>{tournament.description}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

