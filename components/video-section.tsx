"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"

interface VideoPlayerProps {
  src: string
  aspectRatio: "square" | "video"
  objectFit?: "cover" | "contain"
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, aspectRatio, objectFit = "cover" }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
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
    e.stopPropagation() // Prevent triggering play/pause
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl shadow-2xl cursor-pointer max-h-[70vh]",
        aspectRatio === "square" ? "aspect-square" : "aspect-video",
      )}
      onClick={handlePlayPause}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn(
          "absolute top-0 left-0 w-full h-full",
          objectFit === "contain" ? "object-contain" : "object-cover",
        )}
        playsInline
        loop
        muted={isMuted}
      />
      <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out">
        {/* Show large centered play button only when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              onClick={(e) => {
                e.stopPropagation() // Prevent double triggering
                handlePlayPause()
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-16 h-16 flex items-center justify-center transition-transform duration-300 hover:scale-110"
            >
              <Play size={24} />
            </Button>
          </div>
        )}

        {/* Controls container at the bottom */}
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          {/* Show small play/pause button next to volume when playing */}
          {isPlaying && (
            <Button
              onClick={(e) => {
                e.stopPropagation() // Prevent double triggering
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
        </div>
      </div>
    </div>
  )
}

export default function VideoSection() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-center mb-12",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          Experience SkyBall™
        </h2>
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          {/* Square video container */}
          <div
            className={cn(
              "transition-all duration-700 delay-200 w-full lg:w-1/3 flex justify-center",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <div className="w-full max-w-[min(100%,70vh)]">
              <VideoPlayer
                src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball_promo_aws1.mov"
                aspectRatio="square"
                objectFit="cover" // Use cover for the square video
              />
            </div>
          </div>

          {/* 16:9 video container */}
          <div
            className={cn(
              "transition-all duration-700 delay-300 w-full lg:w-2/3 flex justify-center",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <div className="w-full">
              <VideoPlayer
                src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/rally.mov"
                aspectRatio="video"
                objectFit="contain" // Use contain for the 16:9 video to preserve aspect ratio
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

