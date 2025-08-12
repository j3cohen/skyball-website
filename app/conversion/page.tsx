"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SkyBallCourtAnimation } from "@/components/skyball-court-animation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, RotateCcw, Play } from "lucide-react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"


export default function ConversionPage() {
  const [step, setStep] = useState(0)
  const [quickAnimation, setQuickAnimation] = useState(false)

  const steps = [
    "Start with a standard pickleball court",
    "Add a service line 5ft behind the kitchen line",
    "Extend the centerline to the net to create service boxes",
    "Complete SkyBall court",
  ]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleReset = () => {
    setStep(0)
  }

  const handleQuickAnimation = () => {
    setStep(0)
    setQuickAnimation(true)
  }

  const handleResetQuickAnimation = () => {
    setQuickAnimation(false)
    setStep(0)
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-50 pt-24 pb-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h1
            className="text-4xl font-bold text-center mb-2 text-sky-800"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Creating a SkyBall Court
          </motion.h1>

          <motion.p
            className="text-center text-sky-700 mb-6 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Follow these steps to convert a standard pickleball court into an overhand serve ready SkyBall court
          </motion.p>

          <div className="flex flex-col gap-6">
            {/* Animation stacked on top */}
            <div>
              <Card className="p-4 bg-white/80 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden border-sky-100">
                <div className="max-h-[80vh] flex items-center justify-center">
                  <SkyBallCourtAnimation step={step} quickAnimation={quickAnimation} />
                </div>
              </Card>
            </div>

            {/* Controls and description stacked below */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-sky-600 rounded-full"
                    initial={{ width: `${(step / (steps.length - 1)) * 100}%` }}
                    animate={{ width: `${(step / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl p-4 shadow-md mb-4 border border-sky-100"
                >
                  <h2 className="text-xl font-semibold mb-2 text-sky-800 flex items-center">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 font-bold ${
                        step === 0
                          ? "bg-sky-100 text-sky-800"
                          : step === 1
                            ? "bg-rose-100 text-rose-800"
                            : step === 2
                              ? "bg-purple-100 text-purple-800"
                              : step === 3
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                      }`}
                    >
                      {step + 1}
                    </span>
                    {steps[step]}
                  </h2>
                  <p className="text-gray-700 text-sm">
                    {step === 0 &&
                      "Start with a standard pickleball court layout. The kitchen (non-volley zone) line is 7ft from the net. Note that the centerline divides each side but stops at the kitchen."}
                    {step === 1 &&
                      "Measure and draw a service line 5 feet behind the kitchen line (which places it 12 feet from the net)."}
                    {step === 2 &&
                      "Extend the existing centerline through the kitchen area to the net. This creates the service boxes for SkyBall."}
                    {step === 3 &&
                      "Your SkyBall court is now ready for play! The service boxes are clearly defined for proper serving."}
                    {/* {step === 4 &&
                      "For singles play, add singles lines 2 feet in from each sideline, creating a narrower court similar to tennis singles. The area between the singles line and sideline is called the 'doubles alley'."} */}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  size="sm"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={step === steps.length - 1}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  size="sm"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-sky-600 text-sky-600 hover:bg-sky-50"
                  size="sm"
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  onClick={quickAnimation ? handleResetQuickAnimation : handleQuickAnimation}
                  variant="outline"
                  className="border-sky-600 text-sky-600 hover:bg-sky-50"
                  size="sm"
                >
                  {quickAnimation ? (
                    <>
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Reset
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 h-4 w-4" />
                      Quick Convert
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-md border border-sky-100 mt-4">
                <h2 className="text-lg font-semibold mb-2 text-sky-800">About SkyBall Courts</h2>
                <p className="mb-3 text-gray-700 text-sm">
                  SkyBall can be played on a standard pickleball court using an underhand serve without any modifications. To accommodate overhand serves, SkyBall courts require a service box. The kitchen line
                  in pickleball is 7 feet from the net. The SkyBall service line is placed 5 feet behind the kitchen
                  line (12 feet from the net), and service boxes are created by extending the existing centerline
                  through the kitchen to the net.
                </p>
                {/* <p className="text-gray-700 text-sm">
                  For singles play, optional singles lines can be added 2 feet in from each sideline, creating a
                  narrower court similar to tennis singles.
                </p> */}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
