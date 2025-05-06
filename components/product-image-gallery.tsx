"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ProductImageGalleryProps {
  images: string[]
  alt: string
}

export default function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)

  // If there's only one image, just show it without thumbnails
  if (images.length === 1) {
    return (
      <div className="relative h-full min-h-[400px] w-full">
        <Image
          src={images[0] || "/placeholder.svg"}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative h-[400px] w-full mb-4">
        <Image
          src={images[selectedImage] || "/placeholder.svg"}
          alt={`${alt} - view ${selectedImage + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={cn(
              "relative h-16 w-16 border-2 rounded overflow-hidden flex-shrink-0 transition-all",
              selectedImage === index ? "border-sky-600" : "border-transparent hover:border-gray-300",
            )}
            aria-label={`View image ${index + 1}`}
          >
            <Image
              src={image || "/placeholder.svg"}
              alt={`${alt} thumbnail ${index + 1}`}
              fill
              className="object-cover"
              sizes="64px"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
