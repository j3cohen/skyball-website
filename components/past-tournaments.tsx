"use client"
import { useState } from "react"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPinIcon, TrophyIcon } from "lucide-react"

interface PastTournament {
  id: string
  name: string
  date: string
  location: string
  winner: string
}

const pastTournaments: PastTournament[] = [
  {
    id: "1",
    name: "SkyBall Spring Fling",
    date: "April 22-23, 2023",
    location: "Central Park, New York City",
    winner: "Sarah Johnson",
  },
  {
    id: "2",
    name: "California SkyBall Classic",
    date: "May 13-14, 2023",
    location: "Balboa Park, San Diego",
    winner: "Michael Chen",
  },
  {
    id: "3",
    name: "Windy City SkyBall Showdown",
    date: "June 3-4, 2023",
    location: "Grant Park, Chicago",
    winner: "Emily Rodriguez",
  },
  {
    id: "4",
    name: "Texas SkyBall Open",
    date: "June 24-25, 2023",
    location: "Zilker Park, Austin",
    winner: "David Thompson",
  },
]

export default function PastTournaments() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [visibleTournaments, setVisibleTournaments] = useState(3)

  const loadMore = () => {
    setVisibleTournaments((prevVisible) => Math.min(prevVisible + 3, pastTournaments.length))
  }

  return (
    <section ref={ref} className="py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Past Tournaments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pastTournaments.slice(0, visibleTournaments).map((tournament, index) => (
          <div
            key={tournament.id}
            className={cn(
              "bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
              <div className="flex items-center text-gray-600 mb-2">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span>{tournament.date}</span>
              </div>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPinIcon className="w-4 h-4 mr-2" />
                <span>{tournament.location}</span>
              </div>
              <div className="flex items-center text-sky-600 font-bold">
                <TrophyIcon className="w-4 h-4 mr-2" />
                <span>Winner: {tournament.winner}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {visibleTournaments < pastTournaments.length && (
        <div className="text-center mt-8">
          <Button onClick={loadMore} className="bg-sky-600 hover:bg-sky-700 text-white">
            Load More
          </Button>
        </div>
      )}
    </section>
  )
}

