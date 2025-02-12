"use client"

import { useState, useRef, useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"

export default function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [videoHeight, setVideoHeight] = useState("100vh")
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    const updateVideoHeight = () => {
      if (containerRef.current) {
        const windowHeight = window.innerHeight
        const containerTop = containerRef.current.offsetTop
        const maxHeight = windowHeight - containerTop - 48 // 48px for some bottom padding
        setVideoHeight(`${Math.min(maxHeight, windowHeight * 0.8)}px`) // Max 80% of viewport height
      }
    }

    updateVideoHeight()
    window.addEventListener("resize", updateVideoHeight)
    return () => window.removeEventListener("resize", updateVideoHeight)
  }, [])

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMuteUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <section ref={ref} className="py-12 bg-white">
      <div className="container mx-auto px-4" ref={containerRef}>
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-center mb-8 transition-all duration-700 delay-100",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          Experience SkyBall™
        </h2>
        <div className="flex justify-center">
          <div
            className={cn(
              "relative w-full max-w-sm rounded-xl overflow-hidden shadow-2xl transition-all duration-700 delay-200",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
            style={{ height: videoHeight, maxHeight: "80vh" }}
          >
            <video
              ref={videoRef}
              src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/IMG_8016.mov"
              className="absolute top-0 left-0 w-full h-full object-cover"
              playsInline
              loop
              muted={isMuted}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out">
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={handlePlayPause}
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-16 h-16 flex items-center justify-center transition-transform duration-300 hover:scale-110"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </Button>
              </div>
              <div className="absolute bottom-4 right-4">
                <Button
                  onClick={handleMuteUnmute}
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-transform duration-300 hover:scale-110"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

