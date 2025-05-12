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

  // Parse time string that could be either a single time or a range (e.g., "6:30-8:00 PM" or "7pm")
  const parseTimeString = (timeStr: string): { startTime: string; endTime: string } => {
    // Normalize the time string (remove extra spaces, convert to lowercase)
    const normalizedTime = timeStr.trim().toLowerCase();
    
    // Check if the time string contains a range indicator (hyphen or "to")
    if (normalizedTime.includes("-") || normalizedTime.includes(" to ")) {
      // Split by hyphen or "to" to get start and end times
      const separator = normalizedTime.includes("-") ? "-" : " to ";
      let [startPart, endPart] = normalizedTime.split(separator).map(t => t.trim());
      
      // Check if AM/PM is specified at the end of the range (e.g., "6:30-8:00 PM")
      const hasAmPmAtEnd = /\s+(am|pm)$/i.test(endPart);
      
      if (hasAmPmAtEnd) {
        const amPm = endPart.match(/(am|pm)$/i)?.[0] || "";
        
        // If start time doesn't have AM/PM, add it
        if (!/(am|pm)$/i.test(startPart)) {
          startPart = `${startPart} ${amPm}`;
        }
      }
      
      return { startTime: startPart, endTime: endPart };
    }
    
    // If it's a single time, calculate end time based on duration
    return { 
      startTime: normalizedTime, 
      endTime: "" // We'll calculate this later using durationMinutes
    };
  }

  // Helper function to parse date strings like "May 15, 2025"
  const parseDate = (dateStr: string): Date => {
    // Try to parse with built-in Date constructor
    const date = new Date(dateStr);
    
    // If valid, return it
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // If not valid, try more specific parsing
    // Match patterns like "May 15, 2025"
    const match = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (match) {
      const [, month, day, year] = match; // Removed unused '_' variable
      const monthIndex = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ].indexOf(month.toLowerCase());
      
      if (monthIndex !== -1) {
        return new Date(parseInt(year), monthIndex, parseInt(day));
      }
    }
    
    // If all else fails, throw an error
    throw new Error(`Unable to parse date: ${dateStr}`);
  }

  // Helper function to parse time strings like "6:30 PM"
  const parseTime = (dateObj: Date, timeStr: string): Date => {
    // Normalize the time string
    const normalizedTime = timeStr.trim().toLowerCase();
    
    // Match patterns like "6:30 pm", "6pm", "18:30", etc.
    const match = normalizedTime.match(/(\d{1,2})(?::(\d{2}))?(?:\s*)?(am|pm)?/i);
    
    if (match) {
      const [, hours, minutes, period] = match; // Removed unused '_' variable
      let hoursNum = parseInt(hours);
      
      // Convert to 24-hour format if period is specified
      if (period) {
        if (period.toLowerCase() === 'pm' && hoursNum < 12) {
          hoursNum += 12;
        } else if (period.toLowerCase() === 'am' && hoursNum === 12) {
          hoursNum = 0;
        }
      }
      
      // Create a new date object with the parsed time
      const result = new Date(dateObj);
      result.setHours(hoursNum);
      result.setMinutes(minutes ? parseInt(minutes) : 0);
      result.setSeconds(0);
      result.setMilliseconds(0);
      
      return result;
    }
    
    // If parsing fails, throw an error
    throw new Error(`Unable to parse time: ${timeStr}`);
  }

  const parseEventDateTime = (dateStr: string, timeStr: string): { startDate: Date; endDate: Date } => {
    try {
      console.log(`Parsing date: "${dateStr}" and time: "${timeStr}"`);
      
      // Parse the date part first
      const baseDate = parseDate(dateStr);
      console.log(`Base date parsed as: ${baseDate.toISOString()}`);
      
      // Parse the time range
      const { startTime, endTime } = parseTimeString(timeStr);
      console.log(`Parsed time range: start="${startTime}", end="${endTime}"`);
      
      // Combine date and start time
      const startDate = parseTime(baseDate, startTime);
      console.log(`Start date and time: ${startDate.toISOString()}`);
      
      let endDate: Date;
      
      // If we have an end time from the range, use it
      if (endTime) {
        endDate = parseTime(baseDate, endTime);
        console.log(`End date and time: ${endDate.toISOString()}`);
        
        // If end time is earlier than start time, it might be on the next day
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1);
          console.log(`Adjusted end date to next day: ${endDate.toISOString()}`);
        }
      } else {
        // No end time specified, use duration
        endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        console.log(`Calculated end time using duration: ${endDate.toISOString()}`);
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