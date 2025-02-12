import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { pastTournaments } from "@/data/tournaments"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPinIcon, TrophyIcon } from "lucide-react"

export default function PastTournamentsPage() {
  return (
    <>
      <Navbar />
      <main className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-12">Past SkyBall™ Tournaments</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pastTournaments.map((tournament) => (
              <div key={tournament.id} className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2">{tournament.name}</h2>
                  <div className="flex items-center text-gray-600 mb-2">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>{tournament.date}</span>
                  </div>
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    <span>{tournament.location}</span>
                  </div>
                  <div className="flex items-center text-sky-600 font-bold mb-4">
                    <TrophyIcon className="w-4 h-4 mr-2" />
                    <span>Winner: {tournament.winner}</span>
                  </div>
                  <Link href={`/past-tournaments/${tournament.id}`}>
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

