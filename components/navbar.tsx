"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Menu, X, ChevronDown } from 'lucide-react'
import { cn } from "@/lib/utils"
import { libreFranklin } from "@/app/fonts"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"

// Define the type for navigation items
interface NavItem {
  name: string;
  href: string;
  subItems?: Array<{ name: string; href: string }>;
}

// Update the navItems array to replace Products dropdown with Shop link
const navItems: NavItem[] = [
  { name: "Home", href: "/" },
  // { name: "About", href: "/about" },
  // { name: "Shop", href: "/shop" }, 
  { name: "Rules", href: "/rules" },
  { name: "Play", href: "/play" },
  { name: "Rankings", href: "/rankings" },
  { name: "Shop", href:"/shop" },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Check if we're on the home or about page
  const isTransparentNavbarPage = pathname === "/" || pathname === "/about"

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string) => {
    e.preventDefault()

    // If clicking on the current page's link, just scroll to top
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      // For navigation to a different page:
      // 1. First scroll to top of current page
      window.scrollTo({ top: 0, behavior: "auto" })
      // 2. Then navigate to the new page
      router.push(href)
    }
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault()

    // If we're on the home page, just scroll to top
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      // If we're on any other page, first scroll to top, then navigate to home
      window.scrollTo({ top: 0, behavior: "auto" })
      router.push("/")
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // This effect ensures we start at the top when the route changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "fixed w-full z-50 transition-all duration-300",
        isTransparentNavbarPage
          ? isScrolled
          ? "bg-[#01014c] shadow-md py-2"
          : "bg-[#01014c] py-4"
        : "bg-[#01014c] shadow-md py-2", // Changed from bg-white to bg-[#12284c]
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <a href="/" className="transition-all duration-300 hover:scale-105" onClick={handleLogoClick}>
            <Image
              src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/SkyBall_Favicon.jpg"
              alt="SkyBall"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </a>
          <div className="hidden md:flex space-x-8 items-center">
            {navItems.map((item) => (
              <div key={item.name} className="relative group">
                <a
                  href={item.href}
                  onClick={(e) => handleNavigation(e, item.href)}
                  className={cn(
                    `${libreFranklin.className} text-sm transition-colors duration-300 group-hover:text-sky-600`,
                    isTransparentNavbarPage ? (isScrolled ? "text-white" : "text-white") : "text-white",
                    "flex items-center cursor-pointer",
                  )}
                  onMouseEnter={() => setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  {item.name}
                  {item.subItems && <ChevronDown className="ml-1 h-4 w-4" />}
                </a>
                {item.subItems && (
                  <AnimatePresence>
                    {activeDropdown === item.name && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                        onMouseEnter={() => setActiveDropdown(item.name)}
                        onMouseLeave={() => setActiveDropdown(null)}
                      >
                        <div className="py-1">
                          {item.subItems.map((subItem) => (
                            <a
                              key={subItem.name}
                              href={subItem.href}
                              onClick={(e) => handleNavigation(e, subItem.href)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {subItem.name}
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            ))}
          </div>
          <button
            className={cn(
              "md:hidden transition-transform duration-300 hover:scale-110",
              isTransparentNavbarPage ? (isScrolled ? "text-sky-600" : "text-white") : "text-sky-600", // Blue icon on white background, just like when scrolled
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`${libreFranklin.className} md:hidden absolute top-full left-0 right-0 bg-white shadow-md overflow-hidden`}
          >
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              {navItems.map((item) => (
                <div key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-700 hover:text-sky-600 transition-colors duration-300 block cursor-pointer"
                    onClick={(e) => {
                      handleNavigation(e, item.href)
                      setIsOpen(false)
                    }}
                  >
                    {item.name}
                  </a>
                  {item.subItems && (
                    <div className="ml-4 mt-2 space-y-2">
                      {item.subItems.map((subItem) => (
                        <a
                          key={subItem.name}
                          href={subItem.href}
                          className="text-gray-600 hover:text-sky-600 transition-colors duration-300 block text-sm"
                          onClick={(e) => {
                            handleNavigation(e, subItem.href)
                            setIsOpen(false)
                          }}
                        >
                          {subItem.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}