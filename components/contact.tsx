"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send, Mail, ArrowRight } from "lucide-react"
import { FaYoutube, FaInstagram, FaTiktok } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitSubscription } from "@/app/actions/subscription"

export default function Contact() {
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<{ success?: boolean; message?: string } | null>(null)

  async function handleSubscriptionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setResponse(null)

    // Capture a reference to the form before any async work.
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.append("subject", "Subscription! New Subscriber")

    try {
      console.log("Submitting to submitSubscription in try block:")
      const result = await submitSubscription(formData)
      console.log("Raw result from submitSubscription:", result)

      // Unwrap the result if wrapped in an array.
      const data =
        Array.isArray(result) && result.length === 2 && result[0] === "$ACTION"
          ? result[1]
          : result

      console.log("Unwrapped subscription result:", data, typeof data.success)
      if (data.success === true) {
        setResponse({
          success: true,
          message: "Subscription successful! Thank you for subscribing.",
        })
        // Use the stored reference to reset the form.
        form.reset()
        // After 1 second, hide the form and clear the response.
        setTimeout(() => {
          setShowForm(false)
          setResponse(null)
        }, 1000)
      } else {
        setResponse({
          success: false,
          message: data.message || "Subscription failed. Please try again later.",
        })
      }
    } catch (error) {
      console.error("Error submitting subscription:", error)
      setResponse({
        success: false,
        message: "Something went wrong. Please email info@skyball.us or try again later.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="md:flex">
            {/* Left Side: Contact Information and Social Icons */}
            <div className="md:w-1/2 bg-sky-600 p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
              <p className="mb-4">
                Have questions about SkyBall? Want to organize a tournament? We&apos;re here to help!
              </p>
              <div className="space-y-3 mb-6">
                <p className="flex items-center">
                  <Send size={18} className="mr-2" />
                  <a href="mailto:info@skyball.us" className="hover:underline">
                    info@skyball.us
                  </a>
                </p>
                <p className="flex items-center">
                  <Send size={18} className="mr-2" />
                  <a href="mailto:play@skyball.us" className="hover:underline">
                    play@skyball.us
                  </a>
                </p>
              </div>
              <div className="flex mt-3 space-x-4">
                <a
                  href="https://youtube.com/@skyball.usofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <FaYoutube className="text-xl hover:text-red-500 transition" />
                </a>
                <a
                  href="https://instagram.com/skyball.us"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <FaInstagram className="text-xl hover:text-pink-500 transition" />
                </a>
                <a
                  href="https://tiktok.com/@skyball.us"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <FaTiktok className="text-xl hover:text-gray-400 transition" />
                </a>
              </div>
            </div>

            {/* Right Side: Subscription Form */}
            <div className="md:w-1/2 p-8">
              <h2 className="text-2xl font-bold mb-2 flex items-center text-sky-600">
                <Mail className="mr-2" />
                Stay in the Loop!
              </h2>
              <p className="text-gray-600 mb-4">
                Subscribe to receive updates on tournaments, special events, and all things SkyBall.
              </p>

              {!showForm && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  Get SkyBall Updates <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {showForm && (
                <form className="space-y-6" onSubmit={handleSubscriptionSubmit}>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <Input type="text" id="name" name="name" required className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <Input type="email" id="email" name="email" required className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                      Zip Code (Optional)
                    </label>
                    <Input type="text" id="zip" name="zip" className="mt-1" />
                  </div>
                  <div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Subscribe"}
                    </Button>
                  </div>
                  {response && (
                    <div
                      className={`mt-4 p-4 rounded-md ${
                        response.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {response.message}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
