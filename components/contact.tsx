"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import InfoRequestForm from "@/components/info-request-form"

export default function Contact() {
  const [showForm, setShowForm] = useState(false)

  return (
    <section id="contact" className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="w-full bg-sky-600 p-12 text-white">
            <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
            <p className="mb-6">
              Have questions about SkyBall? Want to organize a tournament? We&apos;re here to help!
            </p>
            <div className="space-y-4 mb-8">
              <p className="flex items-center">
                <Send size={20} className="mr-2" />
                <a href="mailto:info@skyball.us" className="hover:underline">
                  info@skyball.us
                </a>
              </p>
              <p className="flex items-center">
                <Send size={20} className="mr-2" />
                <a href="mailto:play@skyball.us" className="hover:underline">
                  play@skyball.us
                </a>
              </p>
            </div>
            <Button className="bg-white text-sky-600 hover:bg-gray-100" onClick={() => setShowForm(true)}>
              Send Us a Message
            </Button>
          </div>
        </motion.div>
      </div>

      {showForm && <InfoRequestForm subject="General Information Request" onClose={() => setShowForm(false)} />}
    </section>
  )
}

