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
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, aspectRatio }) => {
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
        "relative overflow-hidden rounded-xl shadow-2xl cursor-pointer",
        aspectRatio === "square" ? "aspect-square" : "aspect-video",
        "max-h-[70vh] w-full", // Added w-full to ensure proper sizing
        aspectRatio === "square" ? "max-w-[70vh]" : "", // Limit width for square video to maintain aspect ratio
      )}
      onClick={handlePlayPause} // Make entire container clickable
    >
      <video
        ref={videoRef}
        src={src}
        className="absolute top-0 left-0 w-full h-full object-cover"
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
          {" "}
          {/* Added items-center for vertical centering */}
          <div
            className={cn(
              "transition-all duration-700 delay-200 w-full lg:w-1/3 flex justify-center", // Added flex justify-center
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <VideoPlayer src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/IMG_8016.mov" aspectRatio="square" />
          </div>
          <div
            className={cn(
              "transition-all duration-700 delay-300 w-full lg:w-2/3 flex justify-center", // Added flex justify-center
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <VideoPlayer src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/rally.mov" aspectRatio="video" />
          </div>
        </div>
      </div>
    </section>
  )
}

