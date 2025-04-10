"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react"

interface VideoPlayerProps {
  src: string
  aspectRatio: "square" | "video"
  objectFit?: "cover" | "contain"
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown
}

interface HTMLVideoElementExtended extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void
}


const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, aspectRatio, objectFit = "cover" }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Container ref for requestFullscreen()
  const containerRef = useRef<HTMLDivElement>(null)
  // Video ref for play/pause and fullscreen on iOS
  const videoRef = useRef<HTMLVideoElement>(null)

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

  const handleMuteUnmute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Toggle fullscreen for containerRef (and use iOS-specific API when applicable)
  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation()
  
    const win = window as WindowWithMSStream
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream
  
    if (
      isIOS &&
      videoRef.current &&
      (videoRef.current as HTMLVideoElementExtended).webkitEnterFullscreen
    ) {
      (videoRef.current as HTMLVideoElementExtended).webkitEnterFullscreen!()
    } else {
      if (!document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
    }
  }
  
  

  // Listen for changes in fullscreen state so we can update the icon or perform side effects
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl shadow-2xl cursor-pointer max-h-[70vh]",
        aspectRatio === "square" ? "aspect-square" : "aspect-video"
      )}
      onClick={handlePlayPause}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn(
          "absolute top-0 left-0 w-full h-full",
          objectFit === "contain" ? "object-contain" : "object-cover"
        )}
        playsInline
        loop
        muted={isMuted}
      />

      {/* Overlay for dimming + controls */}
      <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out">
        {/* Large center play button if paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handlePlayPause()
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-16 h-16 flex items-center justify-center transition-transform duration-300 hover:scale-110"
            >
              <Play size={24} />
            </Button>
          </div>
        )}

        {/* Bottom-right controls */}
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          {/* Small play/pause button if currently playing */}
          {isPlaying && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handlePlayPause()
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-transform duration-300 hover:scale-110"
            >
              <Pause size={20} />
            </Button>
          )}

          {/* Mute/unmute */}
          <Button
            onClick={handleMuteUnmute}
            className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-transform duration-300 hover:scale-110"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>

          {/* Fullscreen toggle */}
          <Button
            onClick={handleToggleFullscreen}
            className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-transform duration-300 hover:scale-110"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function VideoSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-center mb-12",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          Experience SkyBall™
        </h2>
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div
            className={cn(
              "transition-all duration-700 delay-200 w-full lg:w-1/3 flex justify-center",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="w-full max-w-[min(100%,70vh)]">
              <VideoPlayer
                src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball_promo_aws1.mov"
                aspectRatio="square"
                objectFit="cover"
              />
            </div>
          </div>

          <div
            className={cn(
              "transition-all duration-700 delay-300 w-full lg:w-2/3 flex justify-center",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="w-full">
              <VideoPlayer
                src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/rally.mov"
                aspectRatio="video"
                objectFit="contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
