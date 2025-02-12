"use client"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MapPinIcon } from "lucide-react"
import { BedIcon, BathIcon } from "lucide-react"

interface Property {
  id: string
  name: string
  location: string
  price: string
  bedrooms: number
  bathrooms: number
}

const properties: Property[] = [
  {
    id: "1",
    name: "Luxury Downtown Condo",
    location: "New York City, NY",
    price: "$1,200,000",
    bedrooms: 2,
    bathrooms: 2,
  },
  {
    id: "2",
    name: "Beachfront Villa",
    location: "Miami Beach, FL",
    price: "$3,500,000",
    bedrooms: 4,
    bathrooms: 3,
  },
  {
    id: "3",
    name: "Mountain Retreat",
    location: "Aspen, CO",
    price: "$2,800,000",
    bedrooms: 3,
    bathrooms: 2,
  },
]

export default function UpcomingProperties() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-center mb-12 transition-all duration-700 delay-100",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          Upcoming Properties
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property, index) => (
            <div
              key={property.id}
              className={cn(
                "bg-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{property.name}</h3>
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPinIcon className="w-4 h-4 mr-2" />
                  <span>{property.location}</span>
                </div>
                <div className="flex items-center text-gray-600 mb-4">
                  <BedIcon className="w-4 h-4 mr-2" />
                  <span>{property.bedrooms} beds</span>
                  <BathIcon className="w-4 h-4 ml-4 mr-2" />
                  <span>{property.bathrooms} baths</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 font-bold">{property.price}</span>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          className={cn(
            "text-center mt-12 transition-all duration-700 delay-500",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <Link href="/properties">
            <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white">
              View All Properties
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

