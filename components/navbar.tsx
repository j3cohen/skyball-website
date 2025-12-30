// components/navbar.tsx
"use client"

import React, { useState, useEffect } from "react"
import { Menu, X, ChevronDown, User, AlertCircle, CheckCircle, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { libreFranklin } from "@/app/fonts"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"
import { useCart } from "@/components/cart-provider";

interface NavItem {
  name: string
  href: string
  subItems?: { name: string; href: string }[]
}

const navItems: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "Rules", href: "/rules" },
  { name: "Play", href: "/play" },
  { name: "Rankings", href: "/rankings" },
  { name: "Shop", href: "/shop" },

]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const {count, hydrated} = useCart();
  const cartCount = hydrated ? count : 0;

  // auth state
  const [session, setSession] = useState<Session | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  useEffect(() => {
    // get initial session
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    // listen for changes
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      if (session) setIsSignUp(false) // close sign-up form on login
      setMessage(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage({ text: error.message, type: "error" })
      else setMessage({ text: "Check your email for a confirmation link.", type: "success" })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ text: error.message, type: "error" })
      else router.refresh()
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const isTransparent = pathname === "/" || pathname === "/about"

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" })
    else router.push("/")
  }

  const handleNavClick = (href: string) => {
    if (href === pathname) window.scrollTo({ top: 0, behavior: "smooth" })
    else router.push(href)
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "fixed w-full z-50 transition-all",
        isTransparent
          ? isScrolled
            ? "bg-[#01014c] shadow-md py-2"
            : "bg-[#01014c] py-4"
          : "bg-[#01014c] shadow-md py-2"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" onClick={handleLogoClick} className="hover:scale-105 transition">
          <Image
            src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/SkyBall_Favicon.jpg"
            alt="SkyBall"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </a>

        {/* Desktop nav & auth */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <div key={item.name} className="relative group">
              <button
                onClick={() => handleNavClick(item.href)}
                onMouseEnter={() => setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
                className={cn(
                  libreFranklin.className,
                  "text-sm transition-colors hover:text-sky-600",
                  isTransparent ? "text-white" : "text-white"
                )}
              >
                {item.name}
                {item.subItems && <ChevronDown className="ml-1 inline h-4 w-4" />}
              </button>
              {item.subItems && activeDropdown === item.name && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                  >
                    {item.subItems.map((sub) => (
                      <button
                        key={sub.href}
                        onClick={() => handleNavClick(sub.href)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        {sub.name}
                      </button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          ))}
          {/* Cart icon (desktop) */}
          <button
            onClick={() => handleNavClick("/cart")}
            aria-label="Cart"
            className="relative text-white hover:text-sky-600 transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[11px] leading-[18px] text-center font-semibold">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          {/* Auth popover trigger */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-white">
                <User className="h-4 w-4" />
                {session?.user?.email ? session.user.email.split("@")[0] : "Sign In"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              {session ? (
                <div className="p-4 space-y-2">
                  <p className="text-sm truncate">{session.user.email}</p>
                  <Button size="sm" className="w-full" onClick={() => router.push("/dashboard")}>
                    Dashboard
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold">{isSignUp ? "Create Account" : "Sign In"}</h3>
                  {message && (
                    <div
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md text-sm",
                        message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      )}
                    >
                      {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      <p>{message.text}</p>
                    </div>
                  )}
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Loading…" : isSignUp ? "Sign Up" : "Sign In"}
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setMessage(null)
                    }}
                    className="text-xs p-0"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </Button>
                </form>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Mobile auth + menu button */}
        <div className="flex md:hidden items-center space-x-2">
          {/* Sign In / User icon */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 text-white">
                <User className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] p-0" align="end">
              {session ? (
                <div className="p-4 space-y-2">
                  <p className="text-sm truncate">{session.user.email}</p>
                  <Button size="sm" className="w-full" onClick={() => router.push("/dashboard")}>
                    Dashboard
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold">{isSignUp ? "Create Account" : "Sign In"}</h3>
                  {message && (
                    <div
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md text-sm",
                        message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      )}
                    >
                      {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      <p>{message.text}</p>
                    </div>
                  )}
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Loading…" : isSignUp ? "Sign Up" : "Sign In"}
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setMessage(null)
                    }}
                    className="text-xs p-0"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </Button>
                </form>
              )}
            </PopoverContent>
          </Popover>

          {/* Cart icon (mobile) */}
          <button
            onClick={() => handleNavClick("/cart")}
            aria-label="Cart"
            className="relative text-white p-1 hover:text-sky-600 transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-sky-500 text-white text-[10px] leading-[16px] text-center font-semibold">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
          {/* Mobile menu toggle */}
          <button className="text-white p-1" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`${libreFranklin.className} md:hidden bg-white shadow-md overflow-hidden`}
          >
            <div className="px-4 py-4 flex flex-col space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    handleNavClick(item.href)
                    setIsOpen(false)
                  }}
                  className="text-gray-700 hover:text-sky-600 text-left"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
