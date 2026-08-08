// components/google-analytics.tsx
'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation' // Use usePathname instead of useSearchParams

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

/**
 * Safe JS string literal for embedding in an inline <script>.
 * JSON.stringify handles quotes/backslashes/newlines; `<` is additionally
 * escaped so a value can never introduce a `</script>` sequence.
 */
function jsLiteral(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export default function GoogleAnalytics() {
  const pathname = usePathname() // Use pathname instead of searchParams

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
        page_path: pathname, // Use pathname instead of window.location.pathname
      })
    }
  }, [pathname]) // Add pathname as a dependency

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
          // SECURITY: never interpolate the pathname into this inline
          // script as a raw quoted literal. Browsers leave apostrophes
          // unencoded in location.pathname, so `/x';alert(1)//` would
          // break out of the string and execute (reflected XSS on every
          // route, including 404s). JSON.stringify emits a properly
          // escaped literal; the id is escaped for symmetry.
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', ${jsLiteral(GA_MEASUREMENT_ID ?? '')}, {
              page_path: ${jsLiteral(pathname ?? '/')},
            });
          `,
        }}
      />
    </>
  )
}