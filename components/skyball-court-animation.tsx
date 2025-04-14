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
  // Mobile detection: if viewport width is less than 768px
  const [isMobile, setIsMobile] = useState<boolean>(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // When quickAnimation is active, force the final state.
  const effectiveStep = quickAnimation ? 4 : step
  const effectiveShowSingles = quickAnimation ? true : showSingles

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 })
  const dimensionsRef = useRef({ width: 800, height: 450 })

  // Court dimensions (in feet)
  const courtWidth = 20 // Standard pickleball court width
  const courtLength = 44 // Standard pickleball court length
  const kitchenDepth = 7 // 7ft from net (non-volley zone)
  const serviceLineDistance = 13.5 // 13.5ft from net (service line)

  // Helper: calculate a canvas position for a given court coordinate.
  const getPosition = (x: number, y: number) => {
    const scale = Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10))
    const offsetX = (dimensions.width - courtWidth * scale) / 2
    const offsetY = (dimensions.height - courtLength * scale) / 2
    return { x: offsetX + x * scale, y: offsetY + y * scale }
  }

  // Pre-calculate positions.
  const netPosition = getPosition(courtWidth / 2, courtLength / 2)
  const topKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 - kitchenDepth)
  const bottomKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 + kitchenDepth)
  const topServicePosition = getPosition(courtWidth / 2, courtLength / 2 - serviceLineDistance)
  const bottomServicePosition = getPosition(courtWidth / 2, courtLength / 2 + serviceLineDistance)

  // Singles line positions.
  const singlesInset = 2
  const leftSinglesPosition = getPosition(singlesInset, courtLength / 2)
  const rightSinglesPosition = getPosition(courtWidth - singlesInset, courtLength / 2)
  const sidelinePosition = getPosition(0, courtLength / 2)
  const farSidelinePosition = getPosition(courtWidth, courtLength / 2)

  // Update dimensions on container resize.
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

  // Draw the court on canvas.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas dimensions.
    canvas.width = dimensionsRef.current.width
    canvas.height = dimensionsRef.current.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear.
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Scale factors.
    const scale = Math.min(canvas.width / (courtWidth + 10), canvas.height / (courtLength + 10))
    const offsetX = (canvas.width - courtWidth * scale) / 2
    const offsetY = (canvas.height - courtLength * scale) / 2
    const courtToCanvas = (x: number, y: number) => ({ x: offsetX + x * scale, y: offsetY + y * scale })

    // Draw the court background.
    const courtCorners = [
      courtToCanvas(0, 0),
      courtToCanvas(courtWidth, 0),
      courtToCanvas(courtWidth, courtLength),
      courtToCanvas(0, courtLength),
    ]
    const gradient = ctx.createLinearGradient(courtCorners[0].x, courtCorners[0].y, courtCorners[2].x, courtCorners[2].y)
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

    // Centerline (stopping at the kitchen).
    ctx.beginPath()
    ctx.moveTo(courtToCanvas(courtWidth / 2, 0).x, courtToCanvas(courtWidth / 2, 0).y)
    ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y)
    ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y)
    ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength).x, courtToCanvas(courtWidth / 2, courtLength).y)
    ctx.strokeStyle = "#588157"
    ctx.lineWidth = 2
    ctx.stroke()

    // Net as a dotted line.
    ctx.beginPath()
    ctx.moveTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
    ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
    ctx.strokeStyle = "#344e41"
    ctx.lineWidth = 4
    ctx.setLineDash([8, 4])
    ctx.stroke()
    ctx.setLineDash([])

    // Kitchen lines.
    ctx.beginPath()
    ctx.moveTo(courtToCanvas(0, courtLength / 2 - kitchenDepth).x, courtToCanvas(0, courtLength / 2 - kitchenDepth).y)
    ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - kitchenDepth).x, courtToCanvas(courtWidth, courtLength / 2 - kitchenDepth).y)
    ctx.moveTo(courtToCanvas(0, courtLength / 2 + kitchenDepth).x, courtToCanvas(0, courtLength / 2 + kitchenDepth).y)
    ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 + kitchenDepth).x, courtToCanvas(courtWidth, courtLength / 2 + kitchenDepth).y)
    ctx.strokeStyle = "#3a5a40"
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw service lines (for effectiveStep in [1,2)).
    if (effectiveStep >= 1 && effectiveStep < 3) {
      ctx.strokeStyle = "#bc4749"
      ctx.lineWidth = 3

      // Top service line.
      ctx.beginPath()
      if (effectiveStep >= 3 && effectiveShowSingles) {
        ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y)
      } else {
        ctx.moveTo(courtToCanvas(0, courtLength / 2 - serviceLineDistance).x, courtToCanvas(0, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y)
      }
      ctx.stroke()

      // Bottom service line.
      ctx.beginPath()
      if (effectiveStep >= 3 && effectiveShowSingles) {
        ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y)
      } else {
        ctx.moveTo(courtToCanvas(0, courtLength / 2 + serviceLineDistance).x, courtToCanvas(0, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y)
      }
      ctx.stroke()

      // In step 1, draw measurement lines.
      if (effectiveStep === 1) {
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = "#bc4749"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(courtToCanvas(courtWidth - 2, courtLength / 2 - kitchenDepth).x, courtToCanvas(courtWidth - 2, courtLength / 2 - kitchenDepth).y)
        ctx.lineTo(courtToCanvas(courtWidth - 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth - 2, courtLength / 2 - serviceLineDistance).y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(courtToCanvas(courtWidth - 2, courtLength / 2 + kitchenDepth).x, courtToCanvas(courtWidth - 2, courtLength / 2 + kitchenDepth).y)
        ctx.lineTo(courtToCanvas(courtWidth - 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth - 2, courtLength / 2 + serviceLineDistance).y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // For effectiveStep >= 3, draw the service box outlines and centerline extensions.
    if (effectiveStep >= 3) {
      ctx.strokeStyle = "#bc4749"
      ctx.lineWidth = 4

      // Top service line.
      ctx.beginPath()
      if (effectiveShowSingles) {
        ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y)
      } else {
        ctx.moveTo(courtToCanvas(0, courtLength / 2 - serviceLineDistance).x, courtToCanvas(0, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y)
      }
      ctx.stroke()

      // Bottom service line.
      ctx.beginPath()
      if (effectiveShowSingles) {
        ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y)
      } else {
        ctx.moveTo(courtToCanvas(0, courtLength / 2 + serviceLineDistance).x, courtToCanvas(0, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y)
      }
      ctx.stroke()

      // Centerline extensions from service line to kitchen.
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y)
      ctx.stroke()

      // Redraw centerline extensions from kitchen to net.
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y)
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y)
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
      ctx.stroke()

      // Draw complete service box outlines.
      if (effectiveStep === 3 || effectiveStep === 4) {
        ctx.strokeStyle = "#bc4749"
        ctx.lineWidth = 4

        // Top left service box.
        ctx.beginPath()
        if (effectiveShowSingles) {
          ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(singlesInset, courtLength / 2).x, courtToCanvas(singlesInset, courtLength / 2).y)
        } else {
          ctx.moveTo(courtToCanvas(0, courtLength / 2 - serviceLineDistance).x, courtToCanvas(0, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()

        // Top right service box.
        ctx.beginPath()
        if (effectiveShowSingles) {
          ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        } else {
          ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()

        // Bottom left service box.
        ctx.beginPath()
        if (effectiveShowSingles) {
          ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(singlesInset, courtLength / 2).x, courtToCanvas(singlesInset, courtLength / 2).y)
        } else {
          ctx.moveTo(courtToCanvas(0, courtLength / 2 + serviceLineDistance).x, courtToCanvas(0, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()

        // Bottom right service box.
        ctx.beginPath()
        if (effectiveShowSingles) {
          ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        } else {
          ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y)
          ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
          ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }

    // Step 4 (and quickAnimation) - Draw singles lines if appropriate.
    if (effectiveStep === 4 || (quickAnimation && effectiveShowSingles)) {
      ctx.strokeStyle = "#2a9d8f"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(singlesInset, 0).x, courtToCanvas(singlesInset, 0).y)
      ctx.lineTo(courtToCanvas(singlesInset, courtLength).x, courtToCanvas(singlesInset, courtLength).y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth - singlesInset, 0).x, courtToCanvas(courtWidth - singlesInset, 0).y)
      ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength).x, courtToCanvas(courtWidth - singlesInset, courtLength).y)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [effectiveStep, effectiveShowSingles, dimensions])

  return (
    <div
      ref={containerRef}
      // On mobile, use full-screen height; otherwise, use a fixed aspect ratio.
      className={`relative w-full ${isMobile ? "h-screen" : "aspect-[16/7]"} bg-gray-50 rounded-lg overflow-hidden shadow-lg`}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      {/* Quick Convert overlays: always render when quickAnimation is active */}
      {quickAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* You can restore all overlay animations here as before */}
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

          {/* Example measurement indicators */}
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
          {/* Singles lines overlay */}
          <AnimatePresence>
            {(effectiveStep === 4) && (
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
                  transition={{ duration: 1, ease: "easeOut", delay: 2.3 }}
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
                  transition={{ duration: 1, ease: "easeOut", delay: 2.5 }}
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
      {/* Desktop (or non-quick) overlays */}
      {!quickAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {effectiveStep === 0 && (
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
            {effectiveStep === 0 && (
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
            {effectiveStep === 1 && !effectiveShowSingles && (
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
            {effectiveStep === 1 && (
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
            {effectiveStep === 2 && (
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
            {effectiveStep === 3 && !effectiveShowSingles && (
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
