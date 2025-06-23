"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
// import { Calendar, MapPin, Users, Trophy, Clock, ChevronRight, AlertCircle, History, Bell } from "lucide-react"
import { Calendar, MapPin, Trophy, Clock, ChevronRight, History, Bell } from "lucide-react"
import type { Event } from "@/data/events"
// import { events as staticEvents } from "@/data/events"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { subscribeToOpenPlayNotifications } from "@/app/actions/open-play-notifications"
import { AddToCalendarDropdown } from "@/components/add-to-calendar-dropdown"
import RaceTo300Announcement from "@/components/race-to-300-banner"
import { submitRegistration } from "@/app/actions/registration"

type TabValue = "open-play" | "tournaments"

interface PlayEventProps {
  events: Event[]
}

function Modal({ open, onClose, children }: { open: boolean; onClose(): void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <button className="text-gray-500 mb-4" onClick={onClose}>✕ Close</button>
        {children}
      </div>
    </div>
  )
}
function TelegramRegistrationForm({
  event,
  onSuccess,
}: {
  event: Event
  onSuccess(): void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [zip, setZip] = useState("")
  const [dob, setDob] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.append("tournamentId", event.id)
    formData.append("tournamentName", event.name)
    formData.append("tournamentDate", event.date)
    formData.append("name", name)
    formData.append("email", email)
    formData.append("phone", phone)
    formData.append("zip", zip)
    formData.append("dob", dob)
    const result = await submitRegistration(formData)
    if (result.success) {
      onSuccess()
    } else {
      setError(result.message ?? "Submission failed")
      setSubmitting(false)
    }
  }

   return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}
      <div>
        <Label>Name</Label>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <Label>Email</Label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <Label>Phone</Label>
        <input
          required
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <Label>ZIP Code</Label>
        <input
          required
          value={zip}
          onChange={e => setZip(e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
      <div>
        <Label>Date of Birth</Label>
        <input
          type="date"
          required
          value={dob}
          onChange={e => setDob(e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Registration"}
      </Button>
    </form>
  )
}

export function PlayEvents({ events }: PlayEventProps) {
  const searchParams = useSearchParams()

  // Get the tab from URL parameter or default to "tournaments"
  const tabParam = searchParams.get("tab")
  const initialTab: TabValue = tabParam === "tournaments" || tabParam === "open-play" ? tabParam : "tournaments"

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab)
  const [includePastEvents, setIncludePastEvents] = useState(false)

  const [modalEvent, setModalEvent] = useState<Event | null>(null)


  // Update URL when tab changes
  const handleTabChange = (value: TabValue) => {
    setActiveTab(value)

    // Update URL without full page reload
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set("tab", value)
    window.history.pushState({}, "", newUrl.toString())
  }

  // Listen for popstate events (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get("tab")
      if (tab === "tournaments" || tab === "open-play") {
        setActiveTab(tab as TabValue)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Filter tournaments only (not open play)
  const tournamentEvents = events.filter((event) => {
    // Only include tournaments (not open-play)
    if (event.type === "open-play") {
      return false
    }

    // Filter past events - only show if includePastEvents is true
    if (event.isPast) {
      return includePastEvents
    }

    return true
  })
  tournamentEvents.sort((a, b) => {
    const aTime = new Date(a.date).getTime()
    const bTime = new Date(b.date).getTime()

    // if we’re only showing upcoming, sort soonest first (ascending)
    if (!includePastEvents) {
      return aTime - bTime
    }

    // if past are enabled, sort most recent first (descending)
    return bTime - aTime
  })

  // Get open play events separately
  const openPlayEvents = events.filter((event) => event.type === "open-play" && (!event.isPast || includePastEvents))

  // Split open play events into upcoming and past
  const upcomingOpenPlayEvents = openPlayEvents.filter((event) => !event.isPast)
  upcomingOpenPlayEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const pastOpenPlayEvents = openPlayEvents.filter((event) => event.isPast)
  pastOpenPlayEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())


  // Helper function to get effective participant count
  // This handles the case where currentParticipants is 0 from the DB but might have a value in static data
  // const getEffectiveParticipantCount = (event: Event): number => {
  //   // If currentParticipants is undefined or null, return 0
  //   if (typeof event.currentParticipants !== "number") {
  //     return 0
  //   }

  //   // If it's a past event with 0 participants from the DB view, check static data
  //   if (event.isPast && event.currentParticipants === 0) {
  //     // Look up the event in the static data
  //     const staticEvent = staticEvents.find((e) => e.id === event.id)

  //     // If found and has a non-zero currentParticipants value, use that
  //     if (staticEvent && typeof staticEvent.currentParticipants === "number" && staticEvent.currentParticipants > 0) {
  //       return staticEvent.currentParticipants
  //     }

  //     // Otherwise, return 0 (the actual value from the database)
  //     return 0
  //   }

  //   // For all other cases, return the actual participant count
  //   return event.currentParticipants
  // }

  return (
    <div>
      {/* Simple button toggle for tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-md shadow-sm bg-gray-100 p-1">
          <Button
            variant={activeTab === "open-play" ? "default" : "ghost"}
            className={`rounded-l-md rounded-r-none px-8 py-6 text-base font-medium ${
              activeTab === "open-play" ? "bg-white text-sky-700" : "bg-transparent hover:bg-gray-200 text-gray-700"
            }`}
            onClick={() => handleTabChange("open-play")}
          >
            Open Play
          </Button>
          <Button
            variant={activeTab === "tournaments" ? "default" : "ghost"}
            className={`rounded-r-md rounded-l-none px-8 py-6 text-base font-medium ${
              activeTab === "tournaments" ? "bg-white text-sky-700" : "bg-transparent hover:bg-gray-200 text-gray-700"
            }`}
            onClick={() => handleTabChange("tournaments")}
          >
            Tournaments
          </Button>
        </div>
      </div>

      {/* Open Play Tab */}
      {activeTab === "open-play" && (
        <section>
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Right column: Info and signup - Moved to top on mobile */}
            <div className="md:w-80 lg:w-96 md:order-2 order-1">
              <div className="bg-sky-50 rounded-lg p-5 mb-4">
                <h3 className="text-lg font-semibold mb-3">About Open Play</h3>
                <p className="text-gray-700 text-sm mb-3">
                  Open Play sessions are open to everyone! We provide all equipment - just show up and play.
                  Perfect for beginners and experienced players alike.
                </p>
                <p className="text-gray-700 text-sm">
                  We also host spontaneous &quot;pop-up&quot; events throughout NYC. Sign up for notifications to be the
                  first to know!
                </p>
              </div>

              <NotificationSignup defaultType="open-play" />
            </div>

            {/* Left column: Events list - Moved to bottom on mobile */}
            <div className="flex-1 md:order-1 order-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Open Play Sessions</h2>

                {/* Past events toggle for Open Play */}
                <div className="flex items-center gap-2">
                  <Switch id="past-open-play" checked={includePastEvents} onCheckedChange={setIncludePastEvents} />
                  <Label htmlFor="past-open-play" className="flex items-center cursor-pointer text-sm">
                    <History className="h-4 w-4 mr-1.5" />
                    Show past
                  </Label>
                </div>
              </div>

              {upcomingOpenPlayEvents.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {upcomingOpenPlayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 border rounded-lg bg-white border-gray-200 hover:border-sky-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{event.name}</h3>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                            <div className="flex items-center text-gray-600">
                              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{event.date}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{event.time}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{event.location}</span>
                            </div>
                          </div>

                          {event.description && <p className="text-gray-600 mt-2 text-sm">{event.description}</p>}
                        </div>

                        <div className="flex flex-col items-end space-y-2 mt-4">
                          <AddToCalendarDropdown
                            name={event.name}
                            date={event.date}
                            time={event.time}
                            location={event.location}
                            description={event.description}
                          />
                          {event.paymentLink ? (
                            <a
                              href={event.paymentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm"
                            >
                              Register
                            </a>
                          ) : (
                            <Button size="sm" onClick={() => setModalEvent(event)}>
                              Register
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg mb-6">
                  <p className="text-gray-600">No upcoming open play sessions scheduled.</p>
                  <p className="text-gray-600 mt-1">
                    Sign up for notifications to be alerted when new sessions are added!
                  </p>
                </div>
              )}

              {/* Past events section (only shown when toggle is on) */}
              {includePastEvents && pastOpenPlayEvents.length > 0 && (
                <>
                  <h3 className="text-lg font-medium text-gray-700 mt-8 mb-4">Past Sessions</h3>
                  <div className="space-y-4">
                    {pastOpenPlayEvents.map((event) => (
                      <div key={event.id} className="p-4 border rounded-lg bg-gray-50 border-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <h3 className="text-lg font-semibold">{event.name}</h3>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                PAST
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                              <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">{event.date}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">{event.time}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">{event.location}</span>
                              </div>
                            </div>

                            {/* Show participants for past events */}
                            {/* {typeof event.currentParticipants === "number" && (
                              <div className="flex items-center text-gray-600 mt-2">
                                <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-sm">
                                  {getEffectiveParticipantCount(event)}{" "}
                                  {getEffectiveParticipantCount(event) === 1 ? "participant" : "participants"}
                                </span>
                              </div>
                            )} */}

                            {/* Removed description for past events */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tournaments Tab */}
      {activeTab === "tournaments" && (
        <section>
          <RaceTo300Announcement className="mb-6" />

          {/* Tournaments section */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Left column: Events list - Keep original order for tournaments */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Tournaments</h2>

                {/* Past events toggle for Tournaments */}
                <div className="flex items-center gap-2">
                  <Switch id="past-tournaments" checked={includePastEvents} onCheckedChange={setIncludePastEvents} />
                  <Label htmlFor="past-tournaments" className="flex items-center cursor-pointer text-sm">
                    <History className="h-4 w-4 mr-1.5" />
                    Show past
                  </Label>
                </div>
              </div>

              {tournamentEvents.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {tournamentEvents.map((event) => (
                    <Link
                      href={`/play/${event.id}`}
                      key={event.id}
                      className={`block p-4 border rounded-lg ${
                        event.isPast
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-gray-200 hover:border-sky-200 hover:shadow-sm"
                      } transition-all`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">{event.name}</h3>

                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                                Tournament
                              </span>

                              {/* Show "PAST" badge for past events */}
                              {event.isPast && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                                  PAST
                                </span>
                              )}

                              {/* Show "FULL" badge if event is at capacity and not past */}
                              {event.maxParticipants &&
                                typeof event.currentParticipants === "number" &&
                                event.currentParticipants >= event.maxParticipants &&
                                !event.isPast && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                    FULL
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                            <div className="flex items-center text-gray-600">
                              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{event.date}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{event.time}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{event.location}</span>
                            </div>
                          </div>

                          {/* Participants/spots display - different for past vs upcoming events */}
                          {/* {event.maxParticipants && typeof event.currentParticipants === "number" && (
                            <div className="flex items-center text-gray-600 mt-2">
                              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">
                                {event.isPast
                                  ? // For past events, show number of participants with fallback handling
                                    `${getEffectiveParticipantCount(event)} ${
                                      getEffectiveParticipantCount(event) === 1 ? "participant" : "participants"
                                    }`
                                  : // For upcoming events, show spots remaining
                                    event.currentParticipants >= event.maxParticipants
                                    ? "Full - Waitlist Open"
                                    : `${event.maxParticipants - event.currentParticipants} spots remaining`}
                              </span> */}

                              {/* Show warning icon if almost full (80% or more) - only for upcoming events */}
                              {/* {!event.isPast &&
                                event.currentParticipants >= event.maxParticipants * 0.8 &&
                                event.currentParticipants < event.maxParticipants && (
                                  <span title="Almost full">
                                    <AlertCircle className="h-4 w-4 ml-2 text-amber-500" aria-hidden="true" />
                                  </span>
                                )}
                            </div>
                          )} */}

                          {event.prize && (
                            <div className="flex items-center text-gray-600 mt-2">
                              <Trophy className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{event.prize}</span>
                            </div>
                          )}

                          {/* Show results for past events */}
                          {event.isPast && event.results && (
                            <div className="mt-3 p-2 bg-gray-50 rounded-md">
                              <p className="font-medium text-sm">Results:</p>
                              {event.results.winner && (
                                <p className="text-sm">
                                  Winner: <span className="font-medium">{event.results.winner}</span>
                                </p>
                              )}
                              {event.results.runnerUp && (
                                <p className="text-sm">
                                  Runner-up: <span className="font-medium">{event.results.runnerUp}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Only show description for upcoming events */}
                          {!event.isPast && event.description && (
                            <p className="text-gray-600 mt-2 text-sm">{event.description}</p>
                          )}
                        </div>

                        <div className="flex justify-end items-start pt-1">
                          <div className="inline-flex items-center text-sky-600 font-medium">
                            {event.isPast && event.hasResults
                              ? "View Results"
                              : event.isPast
                                ? "View Recap"
                                : "View Details"}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg mb-6">
                  <p className="text-gray-600">No tournaments currently scheduled.</p>
                  <p className="text-gray-600 mt-1">
                    Sign up for notifications to be alerted when new tournaments are announced!
                  </p>
                </div>
              )}
            </div>

            {/* Right column: Info and signup */}
            <div className="md:w-80 lg:w-96">
              <div className="bg-amber-50 rounded-lg p-5 mb-4">
                <h3 className="text-lg font-semibold mb-3">About Tournaments</h3>
                <p className="text-gray-700 text-sm mb-3">
                  SkyBall tournaments are competitive events with prizes and rankings. Registration is required to
                  participate.
                </p>
                <p className="text-gray-700 text-sm">
                  We host tournaments for all skill levels throughout NYC. Sign up for notifications to be the first to
                  know about new tournaments!
                </p>
              </div>

              <NotificationSignup defaultType="tournament" />
            </div>
          </div>
        </section>
      )}
      <Modal open={!!modalEvent} onClose={() => setModalEvent(null)}>
        {modalEvent && (
          <TelegramRegistrationForm
            event={modalEvent}
            onSuccess={() => setModalEvent(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// Enhanced notification signup component with checkboxes for different notification types
function NotificationSignup({ defaultType = "all" }: { defaultType?: "all" | "open-play" | "tournament" }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Notification preferences
  const [notifyOpenPlay, setNotifyOpenPlay] = useState(defaultType === "open-play" || defaultType === "all")
  const [notifyTournaments, setNotifyTournaments] = useState(defaultType === "tournament" || defaultType === "all")
  const [notifyPopUps, setNotifyPopUps] = useState(defaultType === "open-play" || defaultType === "all")
  const [notifySpecialEvents, setNotifySpecialEvents] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      // Create a FormData object to send to the server
      const formData = new FormData()
      formData.append("name", name)
      if (email) formData.append("email", email)
      if (phone) formData.append("phone", phone)

      // Add notification preferences
      formData.append("notifyOpenPlay", notifyOpenPlay.toString())
      formData.append("notifyTournaments", notifyTournaments.toString())
      formData.append("notifyPopUps", notifyPopUps.toString())
      formData.append("notifySpecialEvents", notifySpecialEvents.toString())

      // Submit to server action
      const result = await subscribeToOpenPlayNotifications(formData)

      if (result.success) {
        setSuccess(true)
        setName("")
        setEmail("")
        setPhone("")

        // Reset success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(result.message || "Failed to sign up. Please try again.")

        // Set field-specific errors if available
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        }
      }
    } catch (err) {
      console.error("Notification signup error:", err)
      setError("Failed to sign up. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <h3 className="font-medium text-lg mb-3 flex items-center">
        <Bell className="h-4 w-4 mr-2" />
        Get SkyBall Notifications
      </h3>

      {success ? (
        <div className="bg-green-50 text-green-700 p-3 rounded-md">
          Thanks for signing up! You&apos;ll receive notifications based on your preferences.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>}

          <div>
            <Label htmlFor="notification-name" className="text-sm">
              Name
            </Label>
            <input
              id="notification-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                fieldErrors.name ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            />
            {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>}
          </div>

          <div>
            <Label htmlFor="notification-email" className="text-sm">
              Email (optional if phone provided)
            </Label>
            <input
              id="notification-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                fieldErrors.email ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>}
          </div>

          <div>
            <Label htmlFor="notification-phone" className="text-sm">
              Phone (optional if email provided)
            </Label>
            <input
              id="notification-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className={`w-full mt-1 px-3 py-2 border rounded-md text-sm ${
                fieldErrors.phone ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            />
            {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone[0]}</p>}
          </div>

          {fieldErrors.contact && <p className="text-red-500 text-xs mt-1">{fieldErrors.contact[0]}</p>}

          <div className="space-y-1">
            <Label className="text-sm font-medium">Notification Preferences</Label>

            <div className="space-y-2 mt-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="notify-open-play"
                  checked={notifyOpenPlay}
                  onCheckedChange={(checked) => setNotifyOpenPlay(checked === true)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="notify-open-play" className="text-sm font-medium">
                    Open Play Sessions
                  </Label>
                  <p className="text-xs text-gray-500">Regular scheduled open play sessions at our partner locations</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="notify-pop-ups"
                  checked={notifyPopUps}
                  onCheckedChange={(checked) => setNotifyPopUps(checked === true)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="notify-pop-ups" className="text-sm font-medium">
                    Pop-up Events
                  </Label>
                  <p className="text-xs text-gray-500">Spontaneous open play events announced just hours before</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="notify-tournaments"
                  checked={notifyTournaments}
                  onCheckedChange={(checked) => setNotifyTournaments(checked === true)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="notify-tournaments" className="text-sm font-medium">
                    Tournaments
                  </Label>
                  <p className="text-xs text-gray-500">Competitive events with registration, rankings, and prizes</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="notify-special"
                  checked={notifySpecialEvents}
                  onCheckedChange={(checked) => setNotifySpecialEvents(checked === true)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="notify-special" className="text-sm font-medium">
                    Special Events
                  </Label>
                  <p className="text-xs text-gray-500">Exhibitions, clinics, and other special SkyBall events</p>
                </div>
              </div>
            </div>
          </div>

          {fieldErrors.notifications && <p className="text-red-500 text-xs mt-1">{fieldErrors.notifications[0]}</p>}

          <div className="text-xs text-gray-500">
            Provide at least one contact method. We&apos;ll only send notifications based on your preferences.
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing up..." : "Sign Up for Notifications"}
          </Button>
        </form>
      )}
    </div>
  )
}
