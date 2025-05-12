"use client"

import { useEffect, useState, useRef } from "react"
import { Calendar, ChevronDown, Download, Globe, Mail } from 'lucide-react'
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

  // Parse time string that could be either a single time or a range (e.g., "6-8pm" or "7pm")
  const parseTimeString = (timeStr: string): { startTime: string; endTime: string } => {
    // Check if the time string contains a range indicator (hyphen or "to")
    if (timeStr.includes("-") || timeStr.toLowerCase().includes(" to ")) {
      // Split by hyphen or "to" to get start and end times
      const separator = timeStr.includes("-") ? "-" : " to ";
      const [startPart, endPart] = timeStr.split(separator).map(t => t.trim());
      
      // Handle cases where AM/PM is only specified in the end time
      let startTime = startPart;
      const endTime = endPart;
      
      // If start time doesn't have AM/PM but end time does, apply the same period
      if (
        !startTime.toLowerCase().includes("am") && 
        !startTime.toLowerCase().includes("pm") && 
        (endTime.toLowerCase().includes("am") || endTime.toLowerCase().includes("pm"))
      ) {
        const period = endTime.toLowerCase().includes("am") ? "am" : "pm";
        startTime = `${startTime}${period}`;
      }
      
      return { startTime, endTime };
    }
    
    // If it's a single time, calculate end time based on duration
    return { 
      startTime: timeStr, 
      endTime: "" // We'll calculate this later using durationMinutes
    };
  }

  const parseEventDateTime = (dateStr: string, timeStr: string): { startDate: Date; endDate: Date } => {
    try {
      const { startTime, endTime } = parseTimeString(timeStr);
      
      // Parse the start date and time
      const startDateStr = `${dateStr} ${startTime}`;
      const startDate = new Date(startDateStr);
      
      // If start date is invalid, throw an error
      if (isNaN(startDate.getTime())) {
        throw new Error(`Invalid start date/time: ${startDateStr}`);
      }
      
      let endDate: Date;
      
      // If we have an end time from the range, use it
      if (endTime) {
        const endDateStr = `${dateStr} ${endTime}`;
        endDate = new Date(endDateStr);
        
        // If end date is invalid, fall back to duration-based calculation
        if (isNaN(endDate.getTime())) {
          endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        }
      } else {
        // No end time specified, use duration
        endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      }
      
      return { startDate, endDate };
    } catch (error) {
      console.error("Error parsing date/time:", error);
      // Fallback to current date/time + 2 hours
      const now = new Date();
      return {
        startDate: now,
        endDate: new Date(now.getTime() + durationMinutes * 60000)
      };
    }
  }

  const handleAddToCalendar = (calendarType: "ics" | "google" | "outlook" | "yahoo") => {
    try {
      const { startDate, endDate } = parseEventDateTime(date, time);

      const event: CalendarEvent = {
        name: name,
        description,
        location,
        startDate: startDate,
        endDate: endDate,
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