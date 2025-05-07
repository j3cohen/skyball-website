"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from "lucide-react"

interface SkyBallCourtAnimationProps {
  step: number
  //showSingles: boolean
  quickAnimation?: boolean
}

export function SkyBallCourtAnimation({
  step,
  //showSingles,
  quickAnimation = false,
}: SkyBallCourtAnimationProps) {
  // Mobile detection: if viewport width is less than 768px, we're on mobile.
  const [isMobile, setIsMobile] = useState<boolean>(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // We'll use the original step values and flags.
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 })
  const dimensionsRef = useRef({ width: 800, height: 450 })

  // Court dimensions (in feet)
  const courtWidth = 20 // Standard pickleball court width
  const courtLength = 44 // Standard pickleball court length
  const kitchenDepth = 7 // 7ft (non-volley zone from net)
  const serviceLineDistance = 13.5 // 13.5ft from net (service line)

  // Calculate positions for overlay elements.
  const getPosition = (x: number, y: number) => {
    const scale = Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10))
    const offsetX = (dimensions.width - courtWidth * scale) / 2
    const offsetY = (dimensions.height - courtLength * scale) / 2
    return { x: offsetX + x * scale, y: offsetY + y * scale }
  }

  // Pre-calculated positions.
  const netPosition = getPosition(courtWidth / 2, courtLength / 2)
  const topKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 - kitchenDepth)
  const bottomKitchenPosition = getPosition(courtWidth / 2, courtLength / 2 + kitchenDepth)
  const topServicePosition = getPosition(courtWidth / 2, courtLength / 2 - serviceLineDistance)
  const bottomServicePosition = getPosition(courtWidth / 2, courtLength / 2 + serviceLineDistance)
  // const singlesInset = 2
  // const leftSinglesPosition = getPosition(singlesInset, courtLength / 2)
  // const rightSinglesPosition = getPosition(courtWidth - singlesInset, courtLength / 2)
  const sidelinePosition = getPosition(0, courtLength / 2)
  const farSidelinePosition = getPosition(courtWidth, courtLength / 2)

    // Also define the scale and offsets for the overlay singles lines

    const scale = Math.min(
      dimensions.width / (courtWidth + 10),
      dimensions.height / (courtLength + 10),
    )
  
    const offsetY = (dimensions.height - courtLength * scale) / 2
    const courtPixelHeight = courtLength * scale

  // Update canvas dimensions when the container resizes.
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

  // Draw the court and all animations/overlays.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = dimensionsRef.current.width
    canvas.height = dimensionsRef.current.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Compute scale and offsets.
    const scale = Math.min(canvas.width / (courtWidth + 10), canvas.height / (courtLength + 10))
    const offsetX = (canvas.width - courtWidth * scale) / 2
    const offsetY = (canvas.height - courtLength * scale) / 2
    const courtToCanvas = (x: number, y: number) => ({ x: offsetX + x * scale, y: offsetY + y * scale })

    // Draw court background with gradient.
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

    // Court outline.
    ctx.strokeStyle = "#588157"
    ctx.lineWidth = 3
    ctx.stroke()

    // Centerline that stops at the kitchen.
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

    // Step 2: Service lines (for steps 1 & 2)
    if (step >= 1 && step < 3) {
      ctx.strokeStyle = "#bc4749"
      ctx.lineWidth = 3
      // Top service line.
      ctx.beginPath()
      // if (step >= 3 && showSingles) {
      //   ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y)
      //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y)
      // } else {
      //   ctx.moveTo(courtToCanvas(0, courtLength / 2 - serviceLineDistance).x, courtToCanvas(0, courtLength / 2 - serviceLineDistance).y)
      //   ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y)
      // }

      ctx.moveTo(courtToCanvas(0, courtLength / 2 - serviceLineDistance).x, courtToCanvas(0, courtLength / 2 - serviceLineDistance).y)
      ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y)

      ctx.stroke()
      // Bottom service line.
      ctx.beginPath()
      // if (step >= 3 && showSingles) {
      //   ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y)
      //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y)
      // } else {

      ctx.moveTo(courtToCanvas(0, courtLength / 2 + serviceLineDistance).x, courtToCanvas(0, courtLength / 2 + serviceLineDistance).y)
      ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y)
      // }
      ctx.stroke()

      // If step is 1, draw the measurement lines.
      if (step === 1) {
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

    // Step 2: (Blue centerline extension animation is handled by overlay)

    // Step 3+: Draw service box outlines and centerline extensions.
    if (step >= 3) {
      ctx.strokeStyle = "#bc4749"
      ctx.lineWidth = 4
      // Redraw service lines (removed in step 3+)
      ctx.beginPath()
      // if (showSingles) {
      //   ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y)
      //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y)
      // } else {
      ctx.moveTo(courtToCanvas(0, courtLength / 2 - serviceLineDistance).x, courtToCanvas(0, courtLength / 2 - serviceLineDistance).y)
      ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y)
      //}
      ctx.stroke()
      ctx.beginPath()
      // if (showSingles) {
      //   ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y)
      //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y)
      // } else {
      ctx.moveTo(courtToCanvas(0, courtLength / 2 + serviceLineDistance).x, courtToCanvas(0, courtLength / 2 + serviceLineDistance).y)
      ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y)
      // }
      ctx.stroke()

      // Draw centerline from service line to kitchen (top)
      //ctx.beginPath()
      //ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
      //ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y)
      //ctx.stroke()

      // Draw centerline from service line to kitchen (bottom)
      //ctx.beginPath()
      //ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
      //ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y)
      //ctx.stroke()

      // Draw centerline extensions from kitchen to net.
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 - kitchenDepth).y)
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).x, courtToCanvas(courtWidth / 2, courtLength / 2 + kitchenDepth).y)
      ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
      ctx.stroke()

      // Draw complete service box outlines (for step 3 or 4)
      if (step === 3 || step === 4) {
        ctx.strokeStyle = "#bc4749"
        ctx.lineWidth = 4

        // Top left service box
        ctx.beginPath()
        // if (showSingles) {
        //   ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 - serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        //   ctx.lineTo(courtToCanvas(singlesInset, courtLength / 2).x, courtToCanvas(singlesInset, courtLength / 2).y)
        // } else {
        ctx.moveTo(courtToCanvas(0, courtLength / 2 - serviceLineDistance).x, courtToCanvas(0, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        ctx.lineTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
        // }
        ctx.closePath()
        ctx.stroke()

        // Top right service box
        ctx.beginPath()
        // if (showSingles) {
        //   ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 - serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2).y)
        //   ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        // } else {
        ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 - serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
        ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        // }
        ctx.closePath()
        ctx.stroke()

        // Bottom left service box
        ctx.beginPath()
        // if (showSingles) {
        //   ctx.moveTo(courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(singlesInset, courtLength / 2 + serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        //   ctx.lineTo(courtToCanvas(singlesInset, courtLength / 2).x, courtToCanvas(singlesInset, courtLength / 2).y)
        // } else {
        ctx.moveTo(courtToCanvas(0, courtLength / 2 + serviceLineDistance).x, courtToCanvas(0, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        ctx.lineTo(courtToCanvas(0, courtLength / 2).x, courtToCanvas(0, courtLength / 2).y)
       // }
        ctx.closePath()
        ctx.stroke()

        // Bottom right service box
        ctx.beginPath()
        // if (showSingles) {
        //   ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2 + serviceLineDistance).y)
        //   ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength / 2).x, courtToCanvas(courtWidth - singlesInset, courtLength / 2).y)
        //   ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        // } else {
        ctx.moveTo(courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth / 2, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).x, courtToCanvas(courtWidth, courtLength / 2 + serviceLineDistance).y)
        ctx.lineTo(courtToCanvas(courtWidth, courtLength / 2).x, courtToCanvas(courtWidth, courtLength / 2).y)
        ctx.lineTo(courtToCanvas(courtWidth / 2, courtLength / 2).x, courtToCanvas(courtWidth / 2, courtLength / 2).y)
        // }
        ctx.closePath()
        ctx.stroke()
      }
    }

    // Step 4: Draw singles lines.
  //   if (step === 4 || (quickAnimation)) {
  //     ctx.strokeStyle = "#2a9d8f"
  //     ctx.lineWidth = 2
  //     ctx.setLineDash([5, 5])
  //     ctx.beginPath()
  //     ctx.moveTo(courtToCanvas(singlesInset, 0).x, courtToCanvas(singlesInset, 0).y)
  //     ctx.lineTo(courtToCanvas(singlesInset, courtLength).x, courtToCanvas(singlesInset, courtLength).y)
  //     ctx.stroke()
  //     ctx.beginPath()
  //     ctx.moveTo(courtToCanvas(courtWidth - singlesInset, 0).x, courtToCanvas(courtWidth - singlesInset, 0).y)
  //     ctx.lineTo(courtToCanvas(courtWidth - singlesInset, courtLength).x, courtToCanvas(courtWidth - singlesInset, courtLength).y)
  //     ctx.stroke()
  //     ctx.setLineDash([])
  //   }
  //}, [step, showSingles, dimensions])
}, [step, dimensions])

  return (
    <div ref={containerRef} className={`relative w-full ${isMobile ? "h-screen" : "aspect-[16/7]"} bg-gray-50 rounded-lg overflow-hidden shadow-lg`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {/* Render quick convert overlays when quickAnimation is active */}
      {quickAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Left-side overlay labels */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 items-start">
            <motion.div className="flex items-center justify-start" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.0 }}>
              <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-sm font-medium text-red-700">
                Service Line (6.5ft behind kitchen)
              </div>
            </motion.div>
            <motion.div className="flex items-center justify-start" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.7 }}>
              <div className="bg-blue-100 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-blue-700 border border-blue-200">
                Extend centerline to net
              </div>
            </motion.div>
            {/* <motion.div className="flex items-center justify-start" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 2.3 }}>
              <div className="bg-teal-100 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-teal-700 border border-teal-200">
                Add singles lines
              </div>
            </motion.div> */}
          </div>
          {/* 6.5ft measurement indicators */}
          <motion.div className="absolute flex flex-col items-center justify-center z-50" style={{ left: topServicePosition.x + 80, top: (topKitchenPosition.y + topServicePosition.y) / 2 - 25, width: 60, height: 50 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div className="bg-red-100 px-2 py-1 rounded text-sm font-bold text-red-700 shadow-sm border border-red-200 mb-1">
              6.5ft
            </div>
            <ArrowUp className="h-5 w-5 text-red-600" />
          </motion.div>
          <motion.div className="absolute flex flex-col items-center justify-center z-50" style={{ left: bottomServicePosition.x + 80, top: (bottomKitchenPosition.y + bottomServicePosition.y) / 2 - 25, width: 60, height: 50 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div className="bg-red-100 px-2 py-1 rounded text-sm font-bold text-red-700 shadow-sm border border-red-200 mb-1">
              6.5ft
            </div>
            <ArrowDown className="h-5 w-5 text-red-600" />
          </motion.div>
          {/* Service lines animation */}
          <motion.div className="absolute" style={{ left: 0, top: topServicePosition.y, width: dimensions.width, height: 3 }} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
            <div className="w-full h-full bg-red-600"></div>
          </motion.div>
          <motion.div className="absolute" style={{ left: 0, top: bottomServicePosition.y, width: dimensions.width, height: 3 }} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 0.7 }}>
            <div className="w-full h-full bg-red-600"></div>
          </motion.div>
          {/* Centerline extension overlays */}
          <motion.div className="absolute" style={{ left: topKitchenPosition.x - 1.5, top: topKitchenPosition.y, width: 3, height: kitchenDepth * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)), transformOrigin: "top" }} initial={{ scaleY: 0, backgroundColor: "#3b82f6" }} animate={{ scaleY: 1, backgroundColor: ["#3b82f6", "#3b82f6", "#bc4749"] }} transition={{ scaleY: { duration: 0.8, delay: 1.3, ease: "easeOut" }, backgroundColor: { duration: 0.3, delay: 2.8, times: [0, 0.9, 1] } }} />
          <motion.div className="absolute" style={{ left: bottomKitchenPosition.x - 1.5, top: netPosition.y, width: 3, height: kitchenDepth * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)), transformOrigin: "bottom" }} initial={{ scaleY: 0, backgroundColor: "#3b82f6" }} animate={{ scaleY: 1, backgroundColor: ["#3b82f6", "#3b82f6", "#bc4749"] }} transition={{ scaleY: { duration: 0.8, delay: 1.5, ease: "easeOut" }, backgroundColor: { duration: 0.3, delay: 2.8, times: [0, 0.9, 1] } }} />
          {/* Centerline from service line to kitchen (step 3) */}
          <motion.div className="absolute bg-red-600" style={{ left: topServicePosition.x - 1.5, top: topServicePosition.y, width: 3, height: (serviceLineDistance) * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)), transformOrigin: "top" }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1.9, ease: "easeOut" }} />
          <motion.div className="absolute bg-red-600" style={{ left: bottomServicePosition.x - 1.5, top: netPosition.y, width: 3, height: (serviceLineDistance) * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)), transformOrigin: "bottom" }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 1.9, ease: "easeOut" }} />
          {/* Singles lines overlay (step 4) */}
          {/* <AnimatePresence>
            {(step === 4 || (quickAnimation)) && (
              <>
                <motion.div className="absolute bg-teal-500" style={{ left: leftSinglesPosition.x - 1, top: 0, width: 2, height: dimensions.height, transformOrigin: "top" }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, ease: "easeOut", delay: 2.3 }} />
                <motion.div className="absolute bg-teal-500" style={{ left: rightSinglesPosition.x - 1, top: 0, width: 2, height: dimensions.height, transformOrigin: "top" }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, ease: "easeOut", delay: 2.5 }} />
                <motion.div className="absolute flex flex-row items-center justify-center" style={{ left: (sidelinePosition.x + leftSinglesPosition.x) / 2 - 30, top: dimensions.height * 0.25, width: 60, height: 30 }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.2 }}>
                  <ArrowRight className="h-5 w-5 text-teal-600 mr-1" />
                  <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
                    2ft
                  </div>
                </motion.div>
                <motion.div className="absolute flex flex-row items-center justify-center" style={{ left: (farSidelinePosition.x + rightSinglesPosition.x) / 2 - 30, top: dimensions.height * 0.25, width: 60, height: 30 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.2 }}>
                  <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
                    2ft
                  </div>
                  <ArrowLeft className="h-5 w-5 text-teal-600 ml-1" />
                </motion.div>
                <motion.div className="absolute flex flex-row items-center justify-center" style={{ left: (sidelinePosition.x + leftSinglesPosition.x) / 2 - 30, top: dimensions.height * 0.75, width: 60, height: 30 }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.2 }}>
                  <ArrowRight className="h-5 w-5 text-teal-600 mr-1" />
                  <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
                    2ft
                  </div>
                </motion.div>
                <motion.div className="absolute flex flex-row items-center justify-center" style={{ left: (farSidelinePosition.x + rightSinglesPosition.x) / 2 - 30, top: dimensions.height * 0.75, width: 60, height: 30 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.2 }}>
                  <div className="bg-teal-100 px-2 py-1 rounded text-sm font-bold text-teal-700 shadow-sm border border-teal-200">
                    2ft
                  </div>
                  <ArrowLeft className="h-5 w-5 text-teal-600 ml-1" />
                </motion.div>
              </>
            )}
          </AnimatePresence> */}
        </div>
      )}
      {/* Desktop overlays (when quickAnimation is false) */}
      {!quickAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {step === 0 && (
              <motion.div
                className="absolute flex items-center justify-center"
                style={{ left: netPosition.x - 60, top: netPosition.y - 15, width: 120, height: 30 }}
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
                  style={{ left: topKitchenPosition.x - 100, top: topKitchenPosition.y - 40, width: 200, height: 30 }}
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
                  style={{ left: bottomKitchenPosition.x - 100, top: bottomKitchenPosition.y + 10, width: 200, height: 30 }}
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
            {/* {step === 1 && !showSingles && ( */}
            {step === 1 && (
              <>
                <motion.div
                  className="absolute flex items-center justify-center"
                  style={{ left: topServicePosition.x - 140, top: topServicePosition.y - 40, width: 280, height: 30 }}
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
                  style={{ left: bottomServicePosition.x - 140, top: bottomServicePosition.y + 10, width: 280, height: 30 }}
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
                  style={{ left: topServicePosition.x + 80, top: (topKitchenPosition.y + topServicePosition.y) / 2 - 25, width: 60, height: 50 }}
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
                  style={{ left: bottomServicePosition.x + 80, top: (bottomKitchenPosition.y + bottomServicePosition.y) / 2 - 25, width: 60, height: 50 }}
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
                style={{ left: netPosition.x + 30, top: (netPosition.y + topKitchenPosition.y) / 2, width: 280, height: 30 }}
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
            {step === 3 && (
              <motion.div
                className="absolute flex items-center justify-center"
                style={{ left: netPosition.x - 100, top: netPosition.y - 60, width: 200, height: 30 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="z-50 bg-red-100 px-3 py-1 rounded-lg shadow-sm text-sm font-medium text-red-700 border border-red-200">
                  Service Boxes Created
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === 2 && (
              <>
                {/* Top centerline extension animation from kitchen to net */}
                <motion.div
                  className="absolute bg-blue-600"
                  style={{
                    left: topKitchenPosition.x - 1.5,
                    top: topKitchenPosition.y,
                    width: 3,
                    height: kitchenDepth * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "top",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {/* Bottom centerline extension animation from kitchen to net */}
                <motion.div
                  className="absolute bg-blue-600"
                  style={{
                    left: bottomKitchenPosition.x - 1.5,
                    top: netPosition.y,
                    width: 3,
                    height: kitchenDepth * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "bottom",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === 3 && (
              <>
                {/* Centerline extension animations for step 3 */}
                <motion.div
                  className="absolute bg-red-600"
                  style={{
                    left: topServicePosition.x - 1.5,
                    top: topServicePosition.y,
                    width: 3,
                    height: (serviceLineDistance - kitchenDepth) * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "top",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                />
                <motion.div
                  className="absolute bg-red-600"
                  style={{
                    left: bottomServicePosition.x - 1.5,
                    top: bottomKitchenPosition.y,
                    width: 3,
                    height: (serviceLineDistance - kitchenDepth) * Math.min(dimensions.width / (courtWidth + 10), dimensions.height / (courtLength + 10)),
                    transformOrigin: "bottom",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                />
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
