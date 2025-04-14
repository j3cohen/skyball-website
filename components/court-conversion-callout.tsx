"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin } from "lucide-react"

export default function CourtConversionCallout() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="mt-12 max-w-3xl mx-auto"
    >
      <Card className="border-sky-100 hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6 flex items-start">
          <div className="mr-4 mt-1 bg-sky-100 p-2 rounded-full">
            <MapPin className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Play Anywhere</h3>
            <p className="text-gray-600 mb-2">
              SkyBall can be played on any standard pickleball court with a few simple modifications. Learn how to
              convert a court in minutes.
            </p>
            <Link href="/conversion" className="text-sky-600 hover:text-sky-800 font-medium">
              View court conversion guide →
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
