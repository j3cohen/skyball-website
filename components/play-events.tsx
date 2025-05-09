"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, MapPin, Users, Trophy, Clock, ChevronRight, AlertCircle, History } from "lucide-react"
import type { Event } from "@/data/events"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type EventType = "all" | "tournament" | "clinic" | "open-play" | "special"
interface PlayEventProps {
  events: Event[]
}

// helper to coerce anything like "2025-05-15" or "April 24, 2025" into the format you want
// function formatDate(d: string) {
//   const date = new Date(d)
//   return date.toLocaleDateString("en-US", {
//     month: "long",
//     day:   "numeric",
//     year:  "numeric",
//   })
// }

export function PlayEvents({ events }: PlayEventProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType>("all")
  const [includePastEvents, setIncludePastEvents] = useState(false)

  const filteredEvents = events.filter((event) => {
    // Filter by event type
    if (eventTypeFilter !== "all" && event.type !== eventTypeFilter) {
      return false
    }

    // Filter past events - only show if includePastEvents is true
    if (event.isPast) {
      return includePastEvents
    }

    return true
  })

  // Determine which event types are available in the data
  const availableEventTypes = () => {
    const types = new Set<EventType>(["all"])
    events.forEach((event) => {
      types.add(event.type as EventType)
    })
    return Array.from(types)
  }

  const eventTypes = availableEventTypes()

  // Check if we should show the past events toggle
  // Only show it when "all events" or "tournaments" is selected
  const showPastEventsToggle = eventTypeFilter === "all" || eventTypeFilter === "tournament"

  return (
    <div>
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {eventTypes.map((type) => (
          <Button
            key={type}
            variant={eventTypeFilter === type ? "default" : "outline"}
            onClick={() => setEventTypeFilter(type)}
            className="rounded-full"
          >
            {type === "all"
              ? "All Events"
              : type === "tournament"
                ? "Tournaments"
                : type === "clinic"
                  ? "Clinics"
                  : type === "open-play"
                    ? "Open Play"
                    : "Special Events"}
          </Button>
        ))}
      </div>

      {/* Past events toggle - only show when relevant */}
      {showPastEventsToggle && (
        <div className="flex items-center justify-center gap-2 mb-8">
          <Switch id="past-events" checked={includePastEvents} onCheckedChange={setIncludePastEvents} />
          <Label htmlFor="past-events" className="flex items-center cursor-pointer">
            <History className="h-4 w-4 mr-1.5" />
            Include past events
          </Label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredEvents.map((event) => (
          <Link
            href={`/play/${event.id}`}
            key={event.id}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow block"
            scroll={true}
          >
            <div className="relative p-3">
              <div className="flex justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    event.type === "tournament"
                      ? "bg-amber-100 text-amber-800"
                      : event.type === "clinic"
                        ? "bg-blue-100 text-blue-800"
                        : event.type === "open-play"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {event.type === "tournament"
                    ? "Tournament"
                    : event.type === "clinic"
                      ? "Clinic"
                      : event.type === "open-play"
                        ? "Open Play"
                        : "Special Event"}
                </span>

                {/* Show "PAST" badge for past events */}
                {event.isPast && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">PAST</span>
                )}

                {/* Show "FULL" badge if event is at capacity */}
                {event.maxParticipants &&
                  typeof event.currentParticipants === "number" &&
                  event.currentParticipants >= event.maxParticipants &&
                  !event.isPast && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">FULL</span>
                  )}
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-xl font-bold mb-2">{event.name}</h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">{event.date}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">{event.location}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">{event.time}</span>
                </div>

                {/* Spots remaining display */}
                {event.maxParticipants && (
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {typeof event.currentParticipants === "number" && event.currentParticipants >= event.maxParticipants
                        ? "Full - Waitlist Open"
                        : typeof event.currentParticipants === "number" && event.currentParticipants > 0
                          ? `${event.maxParticipants - event.currentParticipants} spots remaining`
                          : `${event.maxParticipants} spots remaining`}
                    </span>

                    {/* Show warning icon if almost full (80% or more) */}
                    {event.maxParticipants &&
                      typeof event.currentParticipants === "number" &&
                      event.currentParticipants >= event.maxParticipants * 0.8 &&
                      event.currentParticipants < event.maxParticipants &&
                      !event.isPast && (
                        <span title="Almost full">
                          <AlertCircle className="h-4 w-4 ml-2 text-amber-500" aria-hidden="true" />
                        </span>
                      )}
                  </div>
                )}

                {event.prize && (
                  <div className="flex items-center text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    <span className="text-sm">{event.prize}</span>
                  </div>
                )}
              </div>

              {/* Show results for past events */}
              {event.isPast && event.results && (
                <div className="mb-4 p-2 bg-gray-50 rounded-md">
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

              <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>

              <div className="inline-flex items-center text-sky-600 font-medium">
                {event.isPast && event.hasResults
                  ? "View Tournament Results"
                  : event.isPast
                    ? "View Recap"
                    : "View Details"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-600">No events found</h3>
          <p className="text-gray-500 mt-2">
            No events match your current filter. Try a different category or check the &quot;Include past events&quot; option.
          </p>
        </div>
      )}
    </div>
  )
}
