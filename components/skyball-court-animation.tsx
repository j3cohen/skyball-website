"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from "lucide-react"

interface SkyBallCourtAnimationProps {
  step: number
  showSingles: boolean
  quickAnimation?: boolean
}

export function SkyBallCourtAnimation({
  step,
  showSingles,
  quickAnimation = false,
}: SkyBallCourtAnimationProps) {
  // Mobile detection: if viewport width is less than 768px, treat as mobile.
  const [isMobile, setIsMobile] = useState<boolean>(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 })
  const dimensionsRef = useRef({ width: 800, height: 450 })

  // Court dimensions (in feet)
  const courtWidth = 20      // Standard pickleball court width
  const courtLength = 44     // Standard pickleball court length
  const kitchenDepth = 7     // Non-volley zone (distance from net)
  const serviceLineDistance = 13.5 // Distance from net to service line

  // Calculate positions for overlay elements based on the current dimensions
  const getPosition = (x: number, y: number) => {
    const scale = Math.min(
      dimensions.width / (courtWidth + 10),
      dimensions.height / (courtLength + 10)
    )
    const offsetX = (dimensions.width - courtWidth * scale) / 2
    const offsetY = (dimensions.height - courtLength * scale) / 2

    return {
      x: offsetX + x * scale,
      y: offsetY + y * scale,
    }
  }

  // Precalculate some positions used for drawing
  const netPosition = getPosition(courtWidth / 2, courtLength / 2)
  const topKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 - kitchenDepth)
  const bottomKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 + kitchenDepth)
  const topServicePosition = getPosition(courtWidth / 2, courtLength / 2 - serviceLineDistance)
  const bottomServicePosition = getPosition(courtWidth / 2, courtLength / 2 + serviceLineDistance)

  // Singles line positions
  const singlesInset = 2 // 2ft in from sidelines
  const leftSinglesPosition = getPosition(singlesInset, courtLength / 2)
  const rightSinglesPosition = getPosition(courtWidth - singlesInset, courtLength / 2)
  const sidelinePosition = getPosition(0, courtLength / 2)
  const farSidelinePosition = getPosition(courtWidth, courtLength / 2)

  // Update the canvas dimensions when the container resizes.
  useEffect(() => {
    const updateDimensions = () => {
      const container = containerRef.current
      if (container) {
        const { width, height } = container.getBoundingClientRect()
        dimensionsRef.current = { width, height }
        setDimensions({ width, height })
      }
    }
    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  // Draw the court and all static lines and (if not mobile) overlays.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = dimensionsRef.current.width
    canvas.height = dimensionsRef.current.height

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Scale factors for converting feet to pixels.
    const scale = Math.min(
      canvas.width / (courtWidth + 10),
      canvas.height / (courtLength + 10)
    )
    const offsetX = (canvas.width - courtWidth * scale) / 2
    const offsetY = (canvas.height - courtLength * scale) / 2

    // Function to convert court coordinates to canvas coordinates.
    const courtToCanvas = (x: number, y: number) => ({
      x: offsetX + x * scale,
      y: offsetY + y * scale,
    })

    // Draw the court background with a gradient.
    const courtCorners = [
      courtToCanvas(0, 0),
      courtToCanvas(courtWidth, 0),
      courtToCanvas(courtWidth, courtLength),
      courtToCanvas(0, courtLength),
    ]
    const gradient = ctx.createLinearGradient(
      courtCorners[0].x,
      courtCorners[0].y,
      courtCorners[2].x,
      courtCorners[2].y
    )
    gradient.addColorStop(0, "#e9f5db")
    gradient.addColorStop(1, "#cfe1b9")

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(courtCorners[0].x, courtCorners[0].y)
    ctx.lineTo(courtCorners[1].x, courtCorners[1].y)
    ctx.lineTo(courtCorners[2].x, courtCorners[2].y)
    ctx.lineTo(courtCorners[3].x, courtCorners[3].y)
    ctx.closePath()
    ctx.fill()

    // Draw court outline.
    ctx.strokeStyle = "#588157"
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw the centerline (stops at the kitchen).
    ctx.beginPath()
    ctx.moveTo(courtToCanvas(courtWidth / 2, 0).x, courtToCanvas(courtWidth / 2, 0).y)
    ctx.lineTo(
      courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x,
      courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y
    )
    ctx.moveTo(
      courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x,
      courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y
    )
    ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength).x, courtToCanvas(courtWidth / 2, courtLength).y)
    ctx.strokeStyle = "#588157"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw the net as a dotted line.
    ctx.beginPath()
    ctx.moveTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
    ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
    ctx.strokeStyle = "#344e41"
    ctx.lineWidth = 4
    ctx.setLineDash([8, 4])
    ctx.stroke()
    ctx.setLineDash([])

    // Draw the kitchen lines (7ft from net).
    ctx.beginPath()
    ctx.moveTo(courtToCanvas(0, courtLength / 2 - kitchenDepth).x, courtToCanvas(0, courtLength / 2 - kitchenDepth).y)
    ctx.lineTo(
      courtToCanvas(courtWidth, courtLength / 2 - kitchenDepth).x,
      courtToCanvas(courtWidth, courtLength / 2 - kitchenDepth).y
    )
    ctx.moveTo(courtToCanvas(0, courtLength / 2 + kitchenDepth).x, courtToCanvas(0, courtLength / 2 + kitchenDepth).y)
    ctx.lineTo(
      courtToCanvas(courtWidth, courtLength / 2 + kitchenDepth).x,
      courtToCanvas(courtWidth, courtLength / 2 + kitchenDepth).y
    )
    ctx.strokeStyle = "#3a5a40"
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw service lines and measurement lines for steps 1 and 2.
    if (step >= 1 && step < 3) {
      ctx.strokeStyle = "#bc4749"
      ctx.lineWidth = 3

      // Top service line (13.5ft from net).
      ctx.beginPath()
      if (step >= 3 && showSingles) {
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y
        )
      } else {
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y
        )
      }
      ctx.stroke()

      // Bottom service line (13.5ft from net).
      ctx.beginPath()
      if (step >= 3 && showSingles) {
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y
        )
      } else {
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y
        )
      }
      ctx.stroke()

      // If step === 1, draw the measurement lines.
      if (step === 1) {
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = "#bc4749"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 - kitchenDepth).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 - kitchenDepth).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 - serviceLineDistance).y
        )
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 + kitchenDepth).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 + kitchenDepth).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 + serviceLineDistance).y
        )
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Steps 3+: Draw service boxes using bold red lines.
    if (step >= 3) {
      ctx.strokeStyle = "#bc4749"
      ctx.lineWidth = 4

      // Top service line.
      ctx.beginPath()
      if (showSingles) {
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y
        )
      } else {
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y
        )
      }
      ctx.stroke()

      // Bottom service line.
      ctx.beginPath()
      if (showSingles) {
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y
        )
      } else {
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).y
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y
        )
      }
      ctx.stroke()

      // Centerline extensions from service lines to kitchen.
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y
      )
      ctx.lineTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y
      )
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y
      )
      ctx.lineTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y
      )
      ctx.stroke()

      // Centerline extensions from kitchen to net.
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y
      )
      ctx.lineTo(
        courtToCanvas(courtWidth / 2, courtLength / 2).x,
        courtToCanvas(courtWidth / 2, courtLength / 2).y
      )
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y
      )
      ctx.lineTo(
        courtToCanvas(courtWidth / 2, courtLength / 2).x,
        courtToCanvas(courtWidth / 2, courtLength / 2).y
      )
      ctx.stroke()

      // Draw complete service box outlines (for step 3/4)
      if (step === 3 || step === 4) {
        ctx.strokeStyle = "#bc4749"
        ctx.lineWidth = 4

        // Top left service box.
        ctx.beginPath()
        if (showSingles) {
          ctx.moveTo(
            courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(singlesInset, courtLength / 2).x,
            courtToCanvas(singlesInset, courtLength / 2).y
          )
        } else {
          ctx.moveTo(
            courtToCanvas(0, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(0, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(0, courtLength / 2).x,
            courtToCanvas(0, courtLength / 2).y
          )
        }
        ctx.closePath()
        ctx.stroke()

        // Top right service box.
        ctx.beginPath()
        if (showSingles) {
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
        } else {
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth, courtLength / 2).x,
            courtToCanvas(courtWidth, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
        }
        ctx.closePath()
        ctx.stroke()

        // Bottom left service box.
        ctx.beginPath()
        if (showSingles) {
          ctx.moveTo(
            courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(singlesInset, courtLength / 2).x,
            courtToCanvas(singlesInset, courtLength / 2).y
          )
        } else {
          ctx.moveTo(
            courtToCanvas(0, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(0, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(0, courtLength / 2).x,
            courtToCanvas(0, courtLength / 2).y
          )
        }
        ctx.closePath()
        ctx.stroke()

        // Bottom right service box.
        ctx.beginPath()
        if (showSingles) {
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
        } else {
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth, courtLength / 2).x,
            courtToCanvas(courtWidth, courtLength / 2).y
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2).x,
            courtToCanvas(courtWidth / 2, courtLength / 2).y
          )
        }
        ctx.closePath()
        ctx.stroke()
      }
    }

    // Step 4 (optional): Draw singles lines.
    if (step === 4 || (quickAnimation && showSingles)) {
      ctx.strokeStyle = "#2a9d8f"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(singlesInset, 0).x, courtToCanvas(singlesInset, 0).y)
      ctx.lineTo(courtToCanvas(singlesInset, courtLength).x, courtToCanvas(singlesInset, courtLength).y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth - singlesInset, 0).x, courtToCanvas(courtWidth - singlesInset, 0).y)
      ctx.lineTo(
        courtToCanvas(courtWidth - singlesInset, courtLength).x,
        courtToCanvas(courtWidth - singlesInset, courtLength).y
      )
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [step, showSingles, dimensions])

  return (
    // On mobile, we make the container full screen (using h-screen) so that the diagram takes up the full view.
    <div
      ref={containerRef}
      className={`relative w-full ${isMobile ? "h-screen" : "aspect-[16/7]"} bg-gray-50 rounded-lg overflow-hidden shadow-lg`}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      {/* On mobile, omit the overlay labels so that the diagram remains uncluttered. */}
      {!isMobile && quickAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Overlay labels for quickAnimation (desktop only) */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 items-start">
            <motion.div
              className="flex items-center justify-start"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-sm font-medium text-red-700">
                Service Line (6.5ft behind kitchen)
              </div>
            </motion.div>
            <motion.div
              className="flex items-center justify-start"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.7 }}
            >
              <div className="bg-blue-100 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-blue-700 border border-blue-200">
                Extend centerline to net
              </div>
            </motion.div>
            <motion.div
              className="flex items-center justify-start"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 2.3 }}
            >
              <div className="bg-teal-100 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-teal-700 border border-teal-200">
                Add singles lines
              </div>
            </motion.div>
          </div>
          {/* Measurement indicators */}
          <motion.div
            className="absolute flex flex-col items-center justify-center z-50"
            style={{
              left: topServicePosition.x + 80,
              top: (topKitchenPosition.y + topServicePosition.y) / 2 - 25,
              width: 60,
              height: 50,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="bg-red-100 px-2 py-1 rounded text-sm font-bold text-red-700 shadow-sm border border-red-200 mb-1">
              6.5ft
            </div>
            <ArrowUp className="h-5 w-5 text-red-600" />
          </motion.div>
          <motion.div
            className="absolute flex flex-col items-center justify-center z-50"
            style={{
              left: bottomServicePosition.x + 80,
              top: (bottomKitchenPosition.y + bottomServicePosition.y) / 2 - 25,
              width: 60,
              height: 50,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="bg-red-100 px-2 py-1 rounded text-sm font-bold text-red-700 shadow-sm border border-red-200 mb-1">
              6.5ft
            </div>
            <ArrowDown className="h-5 w-5 text-red-600" />
          </motion.div>
          {/* (Other overlays like singles lines etc. also rendered conditionally on desktop) */}
          <AnimatePresence>
            {(step === 4 || (quickAnimation && showSingles)) && (
              <>
                <motion.div
                  className="absolute bg-teal-500"
                  style={{
                    left: leftSinglesPosition.x - 1,
                    top: 0,
                    width: 2,
                    height: dimensions.height,
                    transformOrigin: "top",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute bg-teal-500"
                  style={{
                    left: rightSinglesPosition.x - 1,
                    top: 0,
                    width: 2,
                    height: dimensions.height,
                    transformOrigin: "top",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                />
                <motion.div
                  className="absolute flex flex-row items-center justify-center"
                  style={{
                    left: (sidelinePosition.x + leftSinglesPosition.x) / 2 - 30,
                    top: dimensions.height * 0.25,
                    width: 60,
                    height: 30,
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <ArrowRight className="h-5 w-5 text-teal-600 mr-1" />
                  <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
                    2ft
                  </div>
                </motion.div>
                <motion.div
                  className="absolute flex flex-row items-center justify-center"
                  style={{
                    left: (farSidelinePosition.x + rightSinglesPosition.x) / 2 - 30,
                    top: dimensions.height * 0.25,
                    width: 60,
                    height: 30,
                  }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
                    2ft
                  </div>
                  <ArrowLeft className="h-5 w-5 text-teal-600 ml-1" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
      {!isMobile && !quickAnimation && (
        // Desktop overlays for labels. On mobile these are not rendered.
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {step === 0 && (
              <motion.div
                className="absolute flex items-center justify-center"
                style={{
                  left: netPosition.x - 60,
                  top: netPosition.y - 15,
                  width: 120,
                  height: 30,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-1 rounded-full shadow-md text-sm font-bold text-white">
                  NET
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === 0 && (
              <>
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: topKitchenPosition.x - 100,
                    top: topKitchenPosition.y - 40,
                    width: 200,
                    height: 30,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-sm font-medium text-emerald-800">
                    Kitchen Line (7ft from net)
                  </div>
                </motion.div>
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: bottomKitchenPosition.x - 100,
                    top: bottomKitchenPosition.y + 10,
                    width: 200,
                    height: 30,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-sm font-medium text-emerald-800">
                    Kitchen Line (7ft from net)
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === 1 && !showSingles && (
              <>
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: topServicePosition.x - 140,
                    top: topServicePosition.y - 40,
                    width: 280,
                    height: 30,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-sm font-medium text-red-700">
                    Service Line (6.5ft behind kitchen)
                  </div>
                </motion.div>
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: bottomServicePosition.x - 140,
                    top: bottomServicePosition.y + 10,
                    width: 280,
                    height: 30,
                  }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-sm font-medium text-red-700">
                    Service Line (6.5ft behind kitchen)
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === 1 && (
              <>
                <motion.div
                  className="absolute flex flex-col items-center justify-center"
                  style={{
                    left: topServicePosition.x + 80,
                    top: (topKitchenPosition.y + topServicePosition.y) / 2 - 25,
                    width: 60,
                    height: 50,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="bg-red-100 px-2 py-1 rounded text-sm font-bold text-red-700 shadow-sm border border-red-200 mb-1">
                    6.5ft
                  </div>
                  <ArrowUp className="h-5 w-5 text-red-600" />
                </motion.div>
                <motion.div
                  className="absolute flex flex-col items-center justify-center"
                  style={{
                    left: bottomServicePosition.x + 80,
                    top: (bottomKitchenPosition.y + bottomServicePosition.y) / 2 - 25,
                    width: 60,
                    height: 50,
                  }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="bg-red-100 px-2 py-1 rounded text-sm font-bold text-red-700 shadow-sm border border-red-200 mb-1">
                    6.5ft
                  </div>
                  <ArrowDown className="h-5 w-5 text-red-600" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                className="absolute flex items-center justify-center"
                style={{
                  left: netPosition.x + 30,
                  top: (netPosition.y + topKitchenPosition.y) / 2,
                  width: 280,
                  height: 30,
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-blue-100 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-blue-700 border border-blue-200">
                  Extend centerline to net creating service boxes
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === 3 && !showSingles && (
              <motion.div
                className="absolute flex items-center justify-center"
                style={{
                  left: netPosition.x - 100,
                  top: netPosition.y - 60,
                  width: 200,
                  height: 30,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-red-100 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-red-700 border border-red-200">
                  Service Boxes Created
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
