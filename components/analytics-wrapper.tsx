// components/analytics-wrapper.tsx
'use client'

import { Suspense } from 'react'
import GoogleAnalytics from './google-analytics'

export default function AnalyticsWrapper() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalytics />
    </Suspense>
  )
}