"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from "lucide-react"

interface SkyBallCourtAnimationProps {
  step: number
  showSingles: boolean
  quickAnimation?: boolean
}

export function SkyBallCourtAnimation({ step, showSingles, quickAnimation = false }: SkyBallCourtAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 })
  const dimensionsRef = useRef({ width: 800, height: 450 })

  // Court dimensions (in feet, will be scaled to pixels)
  const courtWidth = 20 // Standard pickleball court width
  const courtLength = 44 // Standard pickleball court length
  const kitchenDepth = 7 // Non-volley zone depth (distance from net)
  const serviceLineDistance = 13.5 // Distance from net to service line

  // Calculate positions for overlay elements
  const getPosition = (x: number, y: number) => {
    const scale = Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10))
    const offsetX = (dimensions.width - courtWidth * scale) / 2
    const offsetY = (dimensions.height - courtLength * scale) / 2

    return {
      x: offsetX + x * scale,
      y: offsetY + y * scale,
    }
  }

  // Court positions
  const netPosition = getPosition(courtWidth / 2, courtLength / 2)
  const topKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 - kitchenDepth)
  const bottomKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 + kitchenDepth)
  const topServicePosition = getPosition(courtWidth / 2, courtLength / 2 - serviceLineDistance)
  const bottomServicePosition = getPosition(courtWidth / 2, courtLength / 2 + serviceLineDistance)

  // Singles line positions
  const singlesInset = 2 // 2 feet in from sidelines
  const leftSinglesPosition = getPosition(singlesInset, courtLength / 2)
  const rightSinglesPosition = getPosition(courtWidth - singlesInset, courtLength / 2)
  const sidelinePosition = getPosition(0, courtLength / 2)
  const farSidelinePosition = getPosition(courtWidth, courtLength / 2)

  // Handle resize events
  useEffect(() => {
    const updateDimensions = () => {
      const container = containerRef.current
      if (container) {
        const { width, height } = container.getBoundingClientRect()
        dimensionsRef.current = { width, height }
        setDimensions({ width, height })
      }
    }

    // Initial update
    updateDimensions()

    // Add resize listener
    window.addEventListener("resize", updateDimensions)

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, []) // Empty dependency array - only run on mount and unmount

  // Draw the court
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas dimensions
    canvas.width = dimensionsRef.current.width
    canvas.height = dimensionsRef.current.height

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Scale factors to convert feet to pixels
    const scale = Math.min(canvas.width / (courtWidth + 10), canvas.height / (courtLength + 10))
    const offsetX = (canvas.width - courtWidth * scale) / 2
    const offsetY = (canvas.height - courtLength * scale) / 2

    // Function to convert court coordinates to canvas coordinates
    const courtToCanvas = (x: number, y: number) => ({
      x: offsetX + x * scale,
      y: offsetY + y * scale,
    })

    // Draw court with gradient background
    const courtCorners = [
      courtToCanvas(0, 0),
      courtToCanvas(courtWidth, 0),
      courtToCanvas(courtWidth, courtLength),
      courtToCanvas(0, courtLength),
    ]

    // Create court background gradient - using green tones
    const gradient = ctx.createLinearGradient(
      courtCorners[0].x,
      courtCorners[0].y,
      courtCorners[2].x,
      courtCorners[2].y,
    )
    gradient.addColorStop(0, "#e9f5db")
    gradient.addColorStop(1, "#cfe1b9")

    // Fill court background
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(courtCorners[0].x, courtCorners[0].y)
    ctx.lineTo(courtCorners[1].x, courtCorners[1].y)
    ctx.lineTo(courtCorners[2].x, courtCorners[2].y)
    ctx.lineTo(courtCorners[3].x, courtCorners[3].y)
    ctx.closePath()
    ctx.fill()

    // Draw court outline
    ctx.strokeStyle = "#588157"
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw centerline (that stops at the kitchen)
    ctx.beginPath()
    // Top half centerline (from top baseline to top kitchen)
    ctx.moveTo(courtToCanvas(courtWidth / 2, 0).x, courtToCanvas(courtWidth / 2, 0).y)
    ctx.lineTo(
      courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x,
      courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y,
    )
    // Bottom half centerline (from bottom kitchen to bottom baseline)
    ctx.moveTo(
      courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x,
      courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y,
    )
    ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength).x, courtToCanvas(courtWidth / 2, courtLength).y)

    ctx.strokeStyle = "#588157"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw net as a dotted line
    ctx.beginPath()
    ctx.moveTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
    ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
    ctx.strokeStyle = "#344e41"
    ctx.lineWidth = 4
    ctx.setLineDash([8, 4]) // Make the net line dotted
    ctx.stroke()
    ctx.setLineDash([]) // Reset line dash

    // Draw kitchen lines (non-volley zone) - 7ft from net
    ctx.beginPath()
    // Top kitchen
    ctx.moveTo(courtToCanvas(0, courtLength / 2 - kitchenDepth).x, courtToCanvas(0, courtLength / 2 - kitchenDepth).y)
    ctx.lineTo(
      courtToCanvas(courtWidth, courtLength / 2 - kitchenDepth).x,
      courtToCanvas(courtWidth, courtLength / 2 - kitchenDepth).y,
    )
    // Bottom kitchen
    ctx.moveTo(courtToCanvas(0, courtLength / 2 + kitchenDepth).x, courtToCanvas(0, courtLength / 2 + kitchenDepth).y)
    ctx.lineTo(
      courtToCanvas(courtWidth, courtLength / 2 + kitchenDepth).x,
      courtToCanvas(courtWidth, courtLength / 2 + kitchenDepth).y,
    )
    ctx.strokeStyle = "#3a5a40"
    ctx.lineWidth = 3
    ctx.stroke()

    // Step 2+: Draw service lines
    if (step >= 1 && step < 3) {
      // Only draw service lines in steps 1 and 2, they're replaced by service boxes in step 3+
      ctx.strokeStyle = "#bc4749"
      ctx.lineWidth = 3

      // Top service line (13.5ft from net)
      ctx.beginPath()

      if (step >= 3 && showSingles) {
        // If singles mode is active, only draw between singles lines
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y,
        )
      } else {
        // Otherwise draw full width
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y,
        )
      }
      ctx.stroke()

      // Bottom service line (13.5ft from net)
      ctx.beginPath()

      if (step >= 3 && showSingles) {
        // If singles mode is active, only draw between singles lines
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y,
        )
      } else {
        // Otherwise draw full width
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y,
        )
      }
      ctx.stroke()

      // Draw a measurement line to show 6.5ft distance
      if (step === 1) {
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = "#bc4749"
        ctx.lineWidth = 2

        // Top measurement line
        ctx.beginPath()
        ctx.moveTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 - kitchenDepth).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 - kitchenDepth).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 - serviceLineDistance).y,
        )
        ctx.stroke()

        // Bottom measurement line
        ctx.beginPath()
        ctx.moveTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 + kitchenDepth).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 + kitchenDepth).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - 2, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth - 2, courtLength / 2 + serviceLineDistance).y,
        )
        ctx.stroke()

        // Reset line dash
        ctx.setLineDash([])
      }
    }

    // Step 2: Draw service box lines (extend centerline to net) in blue for animation
    if (step === 2) {
      // In step 2, we only show the blue animation lines, not the red service box lines
      // This will be handled by the animation overlay
    }

    // Step 3+: Highlight service boxes with a single color and bold lines
    if (step >= 3) {
      // Use a consistent color for all service box lines
      ctx.strokeStyle = "#bc4749" // Red to match service line
      ctx.lineWidth = 4 // Make lines bolder

      // Draw service lines (which were removed in step 3+)
      // Top service line
      ctx.beginPath()
      if (showSingles) {
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y,
        )
      } else {
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 - serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y,
        )
      }
      ctx.stroke()

      // Bottom service line
      ctx.beginPath()
      if (showSingles) {
        ctx.moveTo(
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y,
        )
      } else {
        ctx.moveTo(
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(0, courtLength / 2 + serviceLineDistance).y,
        )
        ctx.lineTo(
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x,
          courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y,
        )
      }
      ctx.stroke()

      // Draw centerline from service line to kitchen line (top)
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y,
      )
      ctx.lineTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y,
      )
      ctx.stroke()

      // Draw centerline from service line to kitchen line (bottom)
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y,
      )
      ctx.lineTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y,
      )
      ctx.stroke()

      // Redraw centerline extensions with the same color and width
      // Top centerline extension (from kitchen to net)
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y,
      )
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
      ctx.stroke()

      // Bottom centerline extension (from kitchen to net)
      ctx.beginPath()
      ctx.moveTo(
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x,
        courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y,
      )
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
      ctx.stroke()

      // Draw complete service box outlines
      // For step 4, highlight the service boxes with outlines including the sidelines
      if (step === 3 || step === 4) {
        ctx.strokeStyle = "#bc4749" // Red to match service line
        ctx.lineWidth = 4 // Make lines bolder

        // Top left service box
        ctx.beginPath()
        if (showSingles) {
          // If singles mode is active, only draw between singles lines
          ctx.moveTo(
            courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(singlesInset, courtLength / 2).x, courtToCanvas(singlesInset, courtLength / 2).y)
        } else {
          // Otherwise draw full width
          ctx.moveTo(
            courtToCanvas(0, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(0, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()

        // Top right service box
        ctx.beginPath()
        if (showSingles) {
          // If singles mode is active, only draw between singles lines
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        } else {
          // Otherwise draw full width
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x,
            courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()

        // Bottom left service box
        ctx.beginPath()
        if (showSingles) {
          // If singles mode is active, only draw between singles lines
          ctx.moveTo(
            courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(singlesInset, courtLength / 2).x, courtToCanvas(singlesInset, courtLength / 2).y)
        } else {
          // Otherwise draw full width
          ctx.moveTo(
            courtToCanvas(0, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(0, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()

        // Bottom right service box
        ctx.beginPath()
        if (showSingles) {
          // If singles mode is active, only draw between singles lines
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).x,
            courtToCanvas(courtWidth - singlesInset, courtLength / 2).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        } else {
          // Otherwise draw full width
          ctx.moveTo(
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(
            courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x,
            courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y,
          )
          ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }

    // Step 4 (optional): Draw singles lines
    if (step === 4 || (quickAnimation && showSingles)) {
      ctx.strokeStyle = "#2a9d8f" // Teal for singles lines
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])

      // Left singles line
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(singlesInset, 0).x, courtToCanvas(singlesInset, 0).y)
      ctx.lineTo(courtToCanvas(singlesInset, courtLength).x, courtToCanvas(singlesInset, courtLength).y)
      ctx.stroke()

      // Right singles line
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth - singlesInset, 0).x, courtToCanvas(courtWidth - singlesInset, 0).y)
      ctx.lineTo(
        courtToCanvas(courtWidth - singlesInset, courtLength).x,
        courtToCanvas(courtWidth - singlesInset, courtLength).y,
      )
      ctx.stroke()

      // Reset line dash for the measurement indicators
      ctx.setLineDash([])
    }
  }, [step, showSingles, dimensions]) // Only redraw when step, showSingles, or dimensions change

  return (
    <div ref={containerRef} className="relative w-full aspect-[16/7] bg-gray-50 rounded-lg overflow-hidden shadow-lg">
      <canvas ref={canvasRef} className="w-full h-full" />
      {quickAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Left side labels container */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 items-start">
            {/* Service line label */}
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

            {/* Centerline extension label */}
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

            {/* Singles line label */}
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

          {/* 6.5ft measurement indicators with arrows - positioned directly on the diagram */}
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

          {/* Service lines animation */}
          <motion.div
            className="absolute"
            style={{
              left: 0,
              top: topServicePosition.y,
              width: dimensions.width,
              height: 3,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="w-full h-full bg-red-600"></div>
          </motion.div>

          <motion.div
            className="absolute"
            style={{
              left: 0,
              top: bottomServicePosition.y,
              width: dimensions.width,
              height: 3,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <div className="w-full h-full bg-red-600"></div>
          </motion.div>

          {/* Centerline extensions animation */}
          <motion.div
            className="absolute"
            style={{
              left: topKitchenPosition.x - 1.5,
              top: topKitchenPosition.y,
              width: 3,
              height:
                kitchenDepth * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
              transformOrigin: "top",
            }}
            initial={{ scaleY: 0, backgroundColor: "#3b82f6" }}
            animate={{
              scaleY: 1,
              backgroundColor: ["#3b82f6", "#3b82f6", "#bc4749"],
            }}
            transition={{
              scaleY: { duration: 0.8, delay: 1.3, ease: "easeOut" },
              backgroundColor: { duration: 0.3, delay: 2.8, times: [0, 0.9, 1] },
            }}
          />

          <motion.div
            className="absolute"
            style={{
              left: bottomKitchenPosition.x - 1.5,
              top: netPosition.y,
              width: 3,
              height:
                kitchenDepth * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
              transformOrigin: "bottom",
            }}
            initial={{ scaleY: 0, backgroundColor: "#3b82f6" }}
            animate={{
              scaleY: 1,
              backgroundColor: ["#3b82f6", "#3b82f6", "#bc4749"],
            }}
            transition={{
              scaleY: { duration: 0.8, delay: 1.5, ease: "easeOut" },
              backgroundColor: { duration: 0.3, delay: 2.8, times: [0, 0.9, 1] },
            }}
          />

          {/* Centerline from service line to kitchen animation (top) */}
          <motion.div
            className="absolute bg-red-600"
            style={{
              left: topServicePosition.x - 1.5,
              top: topServicePosition.y,
              width: 3,
              height:
                (serviceLineDistance - kitchenDepth) *
                Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
              transformOrigin: "top",
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, delay: 1.9, ease: "easeOut" }}
          />

          {/* Centerline from service line to kitchen animation (bottom) */}
          <motion.div
            className="absolute bg-red-600"
            style={{
              left: bottomServicePosition.x - 1.5,
              top: bottomKitchenPosition.y,
              width: 3,
              height:
                (serviceLineDistance - kitchenDepth) *
                Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
              transformOrigin: "bottom",
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, delay: 2.1, ease: "easeOut" }}
          />

          {/* Singles lines animation */}
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
            transition={{ duration: 1, delay: 2.3, ease: "easeOut" }}
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
            transition={{ duration: 1, delay: 2.5, ease: "easeOut" }}
          />

          {/* Singles line labels - positioned to avoid overlap */}
          <motion.div
            className="absolute flex flex-row items-center justify-center z-50"
            style={{
              left: (sidelinePosition.x + leftSinglesPosition.x) / 2 - 30,
              top: dimensions.height * 0.08,
              width: 60,
              height: 30,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.7 }}
          >
            <ArrowRight className="h-5 w-5 text-teal-600 mr-1" />
            <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
              2ft
            </div>
          </motion.div>

          <motion.div
            className="absolute flex flex-row items-center justify-center z-50"
            style={{
              left: (farSidelinePosition.x + rightSinglesPosition.x) / 2 - 30,
              top: dimensions.height * 0.08,
              width: 60,
              height: 30,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.7 }}
          >
            <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
              2ft
            </div>
            <ArrowLeft className="h-5 w-5 text-teal-600 ml-1" />
          </motion.div>
        </div>
      )}

      {!quickAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Net label - placed directly on the net line */}
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

          {/* Kitchen lines labels - only show in step 0 */}
          <AnimatePresence>
            {step === 0 && (
              <>
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: topKitchenPosition.x - 100,
                    top: topKitchenPosition.y - 40, // Moved up to avoid covering the line
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
                    top: bottomKitchenPosition.y + 10, // Moved down to avoid covering the line
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

          {/* Service line labels and animations - only show in step 1 when not in singles mode */}
          <AnimatePresence>
            {step === 1 && !showSingles && (
              <>
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: topServicePosition.x - 140,
                    top: topServicePosition.y - 40, // Moved up to avoid covering the line
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
                    top: bottomServicePosition.y + 10, // Moved down to avoid covering the line
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

          {/* Measurement indicators - with arrows pointing in the correct direction */}
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

          {/* Centerline extension label - step 2 */}
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

          {/* Service box labels - only show in step 3 (not step 4) */}
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

          {/* Animated centerline extensions for step 2 */}
          <AnimatePresence>
            {step === 2 && (
              <>
                {/* Top centerline extension animation - grows from kitchen line to net (top to bottom) */}
                <motion.div
                  className="absolute bg-blue-600"
                  style={{
                    left: topKitchenPosition.x - 1.5,
                    top: topKitchenPosition.y,
                    width: 3,
                    height:
                      kitchenDepth *
                      Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "top",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />

                {/* Bottom centerline extension animation - grows from kitchen line to net (bottom to top) */}
                <motion.div
                  className="absolute bg-blue-600"
                  style={{
                    left: bottomKitchenPosition.x - 1.5,
                    top: netPosition.y,
                    width: 3,
                    height:
                      kitchenDepth *
                      Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "bottom",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Animated centerline from service line to kitchen for step 3 */}
          <AnimatePresence>
            {step === 3 && (
              <>
                {/* Top centerline from service line to kitchen animation */}
                <motion.div
                  className="absolute bg-red-600"
                  style={{
                    left: topServicePosition.x - 1.5,
                    top: topServicePosition.y,
                    width: 3,
                    height:
                      (serviceLineDistance - kitchenDepth) *
                      Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "top",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                />

                {/* Bottom centerline from service line to kitchen animation */}
                <motion.div
                  className="absolute bg-red-600"
                  style={{
                    left: bottomServicePosition.x - 1.5,
                    top: bottomKitchenPosition.y,
                    width: 3,
                    height:
                      (serviceLineDistance - kitchenDepth) *
                      Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "bottom",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Singles lines with animated drawing effect */}
          <AnimatePresence>
            {(step === 4 || (quickAnimation && showSingles)) && (
              <>
                {/* Left singles line animation */}
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

                {/* Right singles line animation */}
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

                {/* Singles line measurement indicators - top left */}
                <motion.div
                  className="absolute flex flex-row items-center justify-center"
                  style={{
                    left: (sidelinePosition.x + leftSinglesPosition.x) / 2 - 30,
                    top: dimensions.height * 0.25, // Top quarter of court
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

                {/* Singles line measurement indicators - top right */}
                <motion.div
                  className="absolute flex flex-row items-center justify-center"
                  style={{
                    left: (farSidelinePosition.x + rightSinglesPosition.x) / 2 - 30,
                    top: dimensions.height * 0.25, // Top quarter of court
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

                {/* Singles line measurement indicators - bottom left */}
                <motion.div
                  className="absolute flex flex-row items-center justify-center"
                  style={{
                    left: (sidelinePosition.x + leftSinglesPosition.x) / 2 - 30,
                    top: dimensions.height * 0.75, // Bottom quarter of court
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

                {/* Singles line measurement indicators - bottom right */}
                <motion.div
                  className="absolute flex flex-row items-center justify-center"
                  style={{
                    left: (farSidelinePosition.x + rightSinglesPosition.x) / 2 - 30,
                    top: dimensions.height * 0.75, // Bottom quarter of court
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
    </div>
  )
}
