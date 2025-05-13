// components/google-analytics.tsx
'use client'

import { useEffect } from 'react'
import Script from 'next/script'

// Define types for Google Analytics
type GTagEvent = {
  action: string
  category: string
  label: string
  value: number
}

// Define proper types for gtag function arguments
type GTagParams = 
  | ['js', Date] 
  | ['config', string, { page_path?: string }]
  | ['event', string, GTagEvent]

// Extend the Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: GTagParams[]
    gtag: (...args: GTagParams) => void
  }
}

// Replace with your actual Google Analytics ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

export default function GoogleAnalytics() {
  useEffect(() => {
    // This will run only once on component mount
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || []
      
      // Use function expression instead of function declaration
      const gtag = (...args: GTagParams) => {
        window.dataLayer.push(args)
      }
      
      gtag('js', new Date())
      gtag('config', GA_MEASUREMENT_ID || '', {
        page_path: window.location.pathname,
      })
    }
  }, [])

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}