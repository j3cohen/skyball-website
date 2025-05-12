'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react'

export default function DeckPage() {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [windowHeight, setWindowHeight] = useState(0)

  // Update window height on mount and resize
  useEffect(() => {
    const updateHeight = () => setWindowHeight(window.innerHeight)
    updateHeight() // Initial call
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Calculate the maximum height for the presentation container
  // Subtract header and footer height plus some padding
  const maxPresentationHeight = windowHeight - (isFullScreen ? 0 : 180)
  
  // Calculate width based on 16:9 aspect ratio (standard for presentations)
  // or use a custom aspect ratio if your presentation is different
  const aspectRatio = 16 / 9
  const presentationWidth = Math.min(maxPresentationHeight * aspectRatio, 1200)
  const presentationHeight = presentationWidth / aspectRatio

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  return (
    <div className={`min-h-screen ${isFullScreen ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header - hide in full screen mode */}
      {!isFullScreen && (
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link 
                href="/" 
                className="flex items-center text-sky-600 hover:text-sky-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span>Back to SkyBall</span>
              </Link>
              <h1 className="ml-auto text-xl font-semibold text-gray-900">SkyBall Investor Deck</h1>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={`flex flex-col items-center justify-center ${isFullScreen ? 'h-screen' : 'py-8'}`}>
        <div 
          className={`relative bg-white ${isFullScreen ? '' : 'rounded-lg shadow'} overflow-hidden`}
          style={{ 
            width: isFullScreen ? '100%' : `${presentationWidth}px`,
            height: isFullScreen ? '100%' : `${presentationHeight}px`,
            maxWidth: '100%'
          }}
        >
          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 bg-sky-600 rounded-full mb-4"></div>
              <div className="text-gray-600">Loading presentation...</div>
            </div>
          </div>
          
          {/* Google Slides iframe */}
          <iframe 
            src="https://docs.google.com/presentation/d/e/2PACX-1vSvSkjAy-Jz_teO9bV0ebc41aCgS22Op9_ZWdb0GwXj7L7yh8FkuYdf9kFjwkF1VUyc6mLPT428uP1l/pubembed?start=false&loop=false&delayms=30000" 
            className="absolute inset-0 w-full h-full"
            frameBorder="0" 
            allowFullScreen={true}
            title="SkyBall Investor Deck"
            onError={(e) => {
              console.error("Failed to load presentation", e);
            }}
          />
          
          {/* Full screen toggle button */}
          <button 
            onClick={toggleFullScreen}
            className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-colors"
            aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullScreen ? (
              <Minimize2 className="h-5 w-5 text-gray-700" />
            ) : (
              <Maximize2 className="h-5 w-5 text-gray-700" />
            )}
          </button>
        </div>

        {/* Footer note - hide in full screen mode */}
        {!isFullScreen && (
          <div className="mt-6 text-center text-sm text-gray-500 max-w-3xl">
            <p>This presentation is for authorized partners and investors only.</p>
            <p className="mt-1">For questions or more information, please contact <a href="mailto:info@skyball.us" className="text-sky-600 hover:underline">info@skyball.us</a></p>
          </div>
        )}
      </main>
    </div>
  )
}