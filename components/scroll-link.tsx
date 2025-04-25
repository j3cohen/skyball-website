"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

interface ScrollLinkProps {
  href: string
  children: ReactNode
  className?: string
}

export default function ScrollLink({ href, children, className }: ScrollLinkProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    // Navigate to the new page
    router.push(href)

    // Scroll to top
    window.scrollTo(0, 0)
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
