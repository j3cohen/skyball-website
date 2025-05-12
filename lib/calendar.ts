/**
 * Calendar utility functions for generating calendar links and files
 */

// Event data interface
export interface CalendarEvent {
  name: string
  description?: string
  location?: string
  startDate: Date
  endDate: Date
  url?: string
}

/**
 * Format a date for iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatDateForICS(date: Date): string {
  return date
    .toISOString()
    .replace(/-|:|\.\d+/g, "")
    .replace(/Z$/, "Z")
}

/**
 * Format a date for Google Calendar (YYYYMMDDTHHMMSSZ)
 */
function formatDateForGoogle(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, "")
}

/**
 * Generate an iCalendar (.ics) file content
 */
export function generateICSContent(event: CalendarEvent): string {
  const { name, description, location, startDate, endDate, url } = event

  // Format dates for iCalendar
  const start = formatDateForICS(startDate)
  const end = formatDateForICS(endDate)

  // Generate a unique ID for the event
  const uid = `${start}-${Math.random().toString(36).substring(2, 11)}@skyball.us`

  // Build the iCalendar content
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${name}`,
    `DTSTAMP:${formatDateForICS(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
  ]

  // Add optional fields if they exist
  if (description) icsContent.push(`DESCRIPTION:${description.replace(/\n/g, "\\n")}`)
  if (location) icsContent.push(`LOCATION:${location}`)
  if (url) icsContent.push(`URL:${url}`)

  // Close the event and calendar
  icsContent = [...icsContent, "END:VEVENT", "END:VCALENDAR"]

  return icsContent.join("\r\n")
}

/**
 * Generate a Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const { name, description, location, startDate, endDate } = event

  // Format dates for Google Calendar
  const start = formatDateForGoogle(startDate)
  const end = formatDateForGoogle(endDate)

  // Build the URL with query parameters
  const url = new URL("https://calendar.google.com/calendar/render")
  url.searchParams.append("action", "TEMPLATE")
  url.searchParams.append("text", name)
  url.searchParams.append("dates", `${start}/${end}`)

  // Add optional parameters
  if (description) url.searchParams.append("details", description)
  if (location) url.searchParams.append("location", location)

  return url.toString()
}

/**
 * Generate an Outlook.com calendar URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const { name, description, location, startDate, endDate } = event

  // Format dates for Outlook
  const start = startDate.toISOString()
  const end = endDate.toISOString()

  // Build the URL with query parameters
  const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose")
  url.searchParams.append("subject", name)
  url.searchParams.append("startdt", start)
  url.searchParams.append("enddt", end)
  url.searchParams.append("path", "/calendar/action/compose")
  url.searchParams.append("rru", "addevent")

  // Add optional parameters
  if (description) url.searchParams.append("body", description)
  if (location) url.searchParams.append("location", location)

  return url.toString()
}

/**
 * Generate a Yahoo Calendar URL
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const { name, description, location, startDate, endDate } = event

  // Format dates for Yahoo Calendar
  const start = Math.floor(startDate.getTime() / 1000)
  const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000) // Duration in minutes

  // Build the URL with query parameters
  const url = new URL("https://calendar.yahoo.com/")
  url.searchParams.append("v", "60")
  url.searchParams.append("title", name)
  url.searchParams.append("st", start.toString())
  url.searchParams.append("dur", duration.toString())

  // Add optional parameters
  if (description) url.searchParams.append("desc", description)
  if (location) url.searchParams.append("in_loc", location)

  return url.toString()
}

/**
 * Download an ICS file
 */
export function downloadICSFile(event: CalendarEvent): void {
  const icsContent = generateICSContent(event)
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })

  // Create a download link and trigger it
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${event.name.replace(/\s+/g, "_")}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Parse a date string in the format "Month Day, Year" and a time string in the format "HH:MM AM/PM"
 */
export function parseEventDateTime(dateStr: string, timeStr: string): Date {
  // Combine date and time strings
  const dateTimeStr = `${dateStr} ${timeStr}`

  // Parse the combined string
  const date = new Date(dateTimeStr)

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date or time: ${dateTimeStr}`)
  }

  return date
}

/**
 * Calculate end time based on start time and duration (default 2 hours)
 */
export function calculateEndTime(startDate: Date, durationMinutes = 120): Date {
  const endDate = new Date(startDate)
  endDate.setMinutes(endDate.getMinutes() + durationMinutes)
  return endDate
}
