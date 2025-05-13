// components/page-view-tracker.tsx
'use client'

import { usePageTracking } from '@/hooks/use-page-tracking'

export default function PageViewTracker() {
  usePageTracking()
  return null
}