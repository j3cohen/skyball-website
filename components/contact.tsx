"use client"

import { motion } from "framer-motion"
import { Send } from "lucide-react"

export default function Contact() {
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
            <div className="space-y-4">
              <p className="flex items-center">
                <Send size={20} className="mr-2" />
                info@skyball.us
              </p>
              <p className="flex items-center">
                <Send size={20} className="mr-2" />
                play@skyball.us
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
// "use client"

// import { useState, useRef } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { motion, AnimatePresence } from "framer-motion"
// import { Send, CheckCircle, XCircle } from "lucide-react"
// import { submitContactForm } from "@/app/actions/contact"

// export default function Contact() {
//   const [isSubmitting, setIsSubmitting] = useState(false)
//   const [showPopup, setShowPopup] = useState(false)
//   const [isSuccess, setIsSuccess] = useState(false)
//   const [message, setMessage] = useState("")
//   const formRef = useRef<HTMLFormElement>(null)

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault()
//     setIsSubmitting(true)

//     const formData = new FormData(e.currentTarget)
//     const result = await submitContactForm(formData)

//     setIsSubmitting(false)
//     setIsSuccess(result.success)
//     setMessage(result.message || "An error occurred. Please try again.")
//     setShowPopup(true)

//     if (result.success && formRef.current) {
//       formRef.current.reset()
//     }

//     setTimeout(() => setShowPopup(false), 5000)
//   }

//   return (
//     <section id="contact" className="py-24 bg-gray-50">
//       <div className="container mx-auto px-4">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.8 }}
//           className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden"
//         >
//           <div className="md:flex">
//             <div className="md:w-1/2 bg-sky-600 p-12 text-white">
//               <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
//               <p className="mb-6">Have questions about SkyBall? Want to organize a tournament? We&apos;re here to help!</p>
//               <div className="space-y-4">
//                 <p className="flex items-center">
//                   <Send size={20} className="mr-2" />
//                   info@skyball.us
//                 </p>
//                 <p className="flex items-center">
//                   <Send size={20} className="mr-2" />
//                   play@skyball.us
//                 </p>
//               </div>
//             </div>
//             <div className="md:w-1/2 p-12">
//               <form onSubmit={handleSubmit} className="space-y-6" ref={formRef}>
//                 <div>
//                   <Input
//                     type="text"
//                     id="name"
//                     name="name"
//                     placeholder="Your Name"
//                     className="w-full px-4 py-3 rounded-md border-gray-300 focus:border-sky-600 focus:ring-sky-600"
//                     required
//                     aria-label="Your Name"
//                   />
//                 </div>
//                 <div>
//                   <Input
//                     type="email"
//                     id="email"
//                     name="email"
//                     placeholder="Your Email"
//                     className="w-full px-4 py-3 rounded-md border-gray-300 focus:border-sky-600 focus:ring-sky-600"
//                     required
//                     aria-label="Your Email"
//                   />
//                 </div>
//                 <div>
//                   <Textarea
//                     id="message"
//                     name="message"
//                     placeholder="Your Message"
//                     rows={4}
//                     className="w-full px-4 py-3 rounded-md border-gray-300 focus:border-sky-600 focus:ring-sky-600"
//                     required
//                     aria-label="Your Message"
//                   />
//                 </div>
//                 <Button
//                   type="submit"
//                   className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition-all duration-300 transform hover:scale-105"
//                   disabled={isSubmitting}
//                 >
//                   {isSubmitting ? "Sending..." : "Send Message"}
//                 </Button>
//               </form>
//             </div>
//           </div>
//         </motion.div>
//       </div>
//       <AnimatePresence>
//         {showPopup && (
//           <motion.div
//             initial={{ opacity: 0, y: 50 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: 50 }}
//             className="fixed bottom-5 right-5 bg-white rounded-lg shadow-lg p-6 max-w-sm"
//           >
//             <div className="flex items-center">
//               {isSuccess ? (
//                 <CheckCircle className="text-green-500 mr-3" size={24} />
//               ) : (
//                 <XCircle className="text-red-500 mr-3" size={24} />
//               )}
//               <p className="text-lg font-semibold">
//                 {isSuccess ? "Message Sent Successfully!" : "Failed to Send Message"}
//               </p>
//             </div>
//             <p className="mt-2 text-gray-600">{message}</p>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </section>
//   )
// }

