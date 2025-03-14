"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import InfoRequestForm from "@/components/info-request-form"

export default function FAQContent() {
  const [showForm, setShowForm] = useState(false)

  const faqs = [
    {
      question: "What equipment do I need to play SkyBall?",
      answer:
        "To start playing SkyBall, you need SkyBalls (our unique high density foam balls designed for optimal flight and control), a SkyBall racket (21 inch stringed racket), and a SkyBall net (a pickleball net can also be used).",
    },
    {
      question: "Where can I play SkyBall?",
      answer: (
        <>
          <p className="mb-4">
            SkyBall can be played almost anywhere with a flat surface - indoor or outdoor. This includes public parks or
            playgrounds, school playgrounds, backyard spaces, and indoor gymnasiums.
          </p>
          <div className="mt-4 p-4 bg-sky-50 rounded-lg">
            <h3 className="font-semibold mb-2">Looking for SkyBall in your area?</h3>
            <p className="mb-3">
              Let us know where you&apos;re located, and we&apos;ll help you find or start a SkyBall community near you.
            </p>
            <Button onClick={() => setShowForm(true)} className="bg-sky-600 hover:bg-sky-700 text-white">
              Find SkyBall Near Me
            </Button>
          </div>
        </>
      ),
    },
    {
      question: "How many players do I need for a game?",
      answer: (
        <>
          <p>SkyBall can be played in several formats: Singles (1v1) or Doubles (2v2).</p>
          <p className="mt-2">
            <Link href="/rules" className="text-sky-600 hover:underline">
              View the full rules here
            </Link>
          </p>
        </>
      ),
    },
    {
      question: "Is SkyBall competitive?",
      answer:
        "While SkyBall is fantastic for casual play, we're building a growing competitive scene! We offer local tournaments, league play in select cities, annual championships, rating systems for competitive players, and school and corporate tournaments.",
    },
    {
      question: "What makes SkyBall different from other racket sports?",
      answer:
        "SkyBall combines the best elements of various racket sports while eliminating common barriers to entry. Our unique ball design and simplified rules make it easier to maintain rallies, while the smaller court size makes it more available. The sport emphasizes fun and strategic play with elements of placement, positioning, and control.",
    },
    {
      question: "Are there health benefits to playing SkyBall?",
      answer:
        "Yes! SkyBall offers numerous health benefits including a full-body workout, improved hand-eye coordination, enhanced agility and reflexes, cardiovascular fitness, low-impact exercise that's easy on joints, and mental sharpness through strategic play.",
    },
    {
      question: "How can I start a SkyBall community in my area?",
      answer: (
        <>
          <p className="mb-4">
            We&apos;re excited to help you grow SkyBall in your community! We support new SkyBall communities through
            starter kits for community organizers, online resources and guides, connection with existing SkyBall groups,
            support for setting up local leagues, social media promotion for new groups, and tournament organization
            guidance.
          </p>
          <p>
            <Link href="/become-a-host" className="text-sky-600 hover:underline">
              Learn more about becoming a SkyBall host
            </Link>
          </p>
        </>
      ),
    },
  ]

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h1>
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div key={index} className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">{faq.question}</h2>
              <div className="text-lg">{faq.answer}</div>
            </div>
          ))}
        </div>
      </div>

      {showForm && <InfoRequestForm subject="Where can I play?" onClose={() => setShowForm(false)} />}
    </section>
  )
}

