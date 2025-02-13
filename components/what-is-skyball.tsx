"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

const features = [
  {
    icon: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/tennisRacketImage.png",
    title: "21-inch Stringed Racket",
    description: "Perfect balance of power and control for all skill levels.",
  },
  {
    icon: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/newballicon.png",
    title: "High Density Foam Ball",
    description: "Allows for full power swings and all types of shots like in tennis.",
  },
  {
    icon: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/tenniscourttransparent.png",
    title: "Pickleball Court Size",
    description: "Play on existing courts or easily set up your own anywhere.",
  },
]

export default function WhatIsSkyBall() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-center mb-12"
        >
          What is SkyBall™?
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-center mb-4 h-16">
                    <Image
                      src={feature.icon || "/placeholder.svg"}
                      alt={feature.title}
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-center">{feature.title}</h3>
                  <p className="text-gray-600 text-center">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-lg text-center max-w-3xl mx-auto"
        >
          SkyBall™ emerged from a passion for innovative, accessible sports that bring people together. It combines the
          excitement of tennis with the availability of pickleball. Perfect for
          urban environments and community centers, SkyBall™ offers instant playability for beginners while providing
          enough depth to challenge skilled athletes.
        </motion.p>
      </div>
    </section>
  )
}

