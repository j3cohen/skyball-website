"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type React from "react"
import type { MouseEvent } from "react"

export default function Footer() {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string) => {
    e.preventDefault()
    router.push(href)
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }, 100)
  }

  return (
    <footer className="bg-gray-900 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SkyBall%20logo_B.jpg-dPdFMlGp5QkZiD1KMEEFeGXKxL28hh.jpeg"
              alt="SkyBall™ Logo"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
            <p className="mt-2 text-sm">Where the Rally Never Ends.</p>
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Quick Links</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/" onClick={(e) => handleClick(e, "/")}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" onClick={(e) => handleClick(e, "/about")}>
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/rules" onClick={(e) => handleClick(e, "/rules")}>
                    Rules
                  </Link>
                </li>
                <li>
                  <Link href="/rankings" onClick={(e) => handleClick(e, "/rankings")}>
                    Rankings
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Resources</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/faq" onClick={(e) => handleClick(e, "/faq")}>
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/community-guidelines" onClick={(e) => handleClick(e, "/community-guidelines")}>
                    Community Guidelines
                  </Link>
                </li>
                <li>
                  <Link href="/become-a-host" onClick={(e) => handleClick(e, "/become-a-host")}>
                    Become a Host
                  </Link>
                </li>
                <li>
                  <Link href="/skyball-for-schools" onClick={(e) => handleClick(e, "/skyball-for-schools")}>
                    SkyBall™ for Schools
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Contact</h3>
              <p className="text-sm">
                General Info: <a href="mailto:info@skyball.us">info@skyball.us</a>
              </p>
              <p className="text-sm">
                Host a tournament: <a href="mailto:play@skyball.us">play@skyball.us</a>
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm">&copy; {new Date().getFullYear()} SkyBall™. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

