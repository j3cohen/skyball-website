"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react"

interface VideoPlayerProps {
  src: string
  aspectRatio: "square" | "video" | "portrait"
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

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = () => {
    if (!videoRef.current) return
    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()
    setIsPlaying(!isPlaying)
  }

  const handleMuteUnmute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation()

    const win = window as WindowWithMSStream
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream

    if (isIOS && videoRef.current && (videoRef.current as HTMLVideoElementExtended).webkitEnterFullscreen) {
      ;(videoRef.current as HTMLVideoElementExtended).webkitEnterFullscreen!()
    } else {
      if (!document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
    }
  }

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "video-fs relative overflow-hidden rounded-xl shadow-2xl cursor-pointer max-h-[70vh]",
        aspectRatio === "square" ? "aspect-square" : aspectRatio === "portrait" ? "aspect-[9/16]" : "aspect-video"
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

      <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out">
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

        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
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

          <Button
            onClick={handleMuteUnmute}
            className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-transform duration-300 hover:scale-110"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>

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

  const videos = [
    "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_homepage_videos/LakeLV_Rally.MOV",
    "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_homepage_videos/skyball_info_video.mp4",
    "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_homepage_videos/PBCourtRally.mov",
  ]

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-center mb-12 transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          Experience SkyBall™
        </h2>

        {/* 1 column on mobile, 3 columns on lg+ */}
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-3 gap-8 items-start transition-all duration-700 delay-200",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {videos.map((src) => (
            <div key={src} className="w-full">
              <VideoPlayer src={src} aspectRatio="portrait" objectFit="cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
