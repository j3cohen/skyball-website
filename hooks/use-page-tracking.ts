// hooks/use-page-tracking.ts
'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Replace with your actual Google Analytics ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

export function usePageTracking() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname && typeof window !== 'undefined' && (window as any).gtag) {
      // Get search params from window.location instead
      const searchParamsString = window.location.search || ''
      
      const url = pathname + searchParamsString
      
      // Send pageview with the page's URL
      ;(window as any).gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      })
    }
  }, [pathname])
}