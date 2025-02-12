"use client"

import { motion } from "framer-motion"

export default function AboutHero() {
  return (
    <section className="relative h-[60vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-sky-900/70" />
      </div>
      <div className="relative container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center text-white"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6">About SkyBall</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">
            Discover the story behind the sport that&apos;s revolutionizing racket games and bringing communities together.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

