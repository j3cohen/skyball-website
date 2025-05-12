"use client"

import { useEffect, useState, useRef } from "react"
import { Calendar, ChevronDown, Download, Globe, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  type CalendarEvent,
  downloadICSFile,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateYahooCalendarUrl,
  parseEventDateTime,
  calculateEndTime,
} from "@/lib/calendar"

interface AddToCalendarProps {
  name: string
  date: string
  time: string
  location: string
  description?: string
  durationMinutes?: number
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

export function AddToCalendarDropdown({
  name,
  date,
  time,
  location,
  description,
  durationMinutes = 120,
  variant = "outline",
  size = "sm",
}: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pageUrl, setPageUrl] = useState("")
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href)
    }
  }, [])

  const handleAddToCalendar = (calendarType: "ics" | "google" | "outlook" | "yahoo") => {
    try {
      const startDate = parseEventDateTime(date, time)
      const endDate = calculateEndTime(startDate, durationMinutes)

      const event: CalendarEvent = {
        name,
        description,
        location,
        startDate,
        endDate,
        url: pageUrl,
      }

      switch (calendarType) {
        case "ics":
          downloadICSFile(event)
          break
        case "google":
          window.open(generateGoogleCalendarUrl(event), "_blank")
          break
        case "outlook":
          window.open(generateOutlookCalendarUrl(event), "_blank")
          break
        case "yahoo":
          window.open(generateYahooCalendarUrl(event), "_blank")
          break
      }

      setIsOpen(false)
    } catch (error) {
      console.error("Error adding to calendar:", error)
      alert("There was an error adding this event to your calendar. Please try again.")
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button ref={buttonRef} variant={variant} size={size} className="text-sky-600 border-sky-200">
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
          <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleAddToCalendar("ics")}>
          <Download className="h-4 w-4 mr-2" />
          <span>Download .ics</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToCalendar("google")}>
          <Globe className="h-4 w-4 mr-2" />
          <span>Google Calendar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToCalendar("outlook")}>
          <Mail className="h-4 w-4 mr-2" />
          <span>Outlook Calendar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToCalendar("yahoo")}>
          <Globe className="h-4 w-4 mr-2" />
          <span>Yahoo Calendar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
