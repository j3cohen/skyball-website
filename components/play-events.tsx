"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, MapPin, Users, Trophy, Clock, ChevronRight, AlertCircle } from "lucide-react"
import { events } from "@/data/events"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type EventType = "all" | "tournament" | "clinic" | "open-play" | "special"
type TimeFilter = "upcoming" | "past" | "all"

export function PlayEvents() {
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType>("all")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming")

  const filteredEvents = events.filter((event) => {
    // Filter by event type
    if (eventTypeFilter !== "all" && event.type !== eventTypeFilter) {
      return false
    }

    // Filter by time (past/upcoming)
    if (timeFilter === "upcoming" && event.isPast) {
      return false
    }
    if (timeFilter === "past" && !event.isPast) {
      return false
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

  return (
    <div>
      <Tabs
        defaultValue="upcoming"
        className="w-full mb-8"
        onValueChange={(value) => setTimeFilter(value as TimeFilter)}
      >
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All Events</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {eventTypes.map((type) => (
          <Button
            key={type}
            variant={eventTypeFilter === type ? "default" : "outline"}
            onClick={() => setEventTypeFilter(type)}
            className="rounded-full"
          >
            {type === "all"
              ? "All Types"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredEvents.map((event) => (
          <Link
            href={`/play/${event.id}`}
            key={event.id}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow block"
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

                {/* Show "FULL" badge if event is at capacity */}
                {event.maxParticipants &&
                  event.currentParticipants &&
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

                {/* Participant count with current/max format */}
                {(event.maxParticipants || event.currentParticipants) && (
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {event.currentParticipants !== undefined && event.maxParticipants !== undefined
                        ? `${event.currentParticipants}/${event.maxParticipants} participants`
                        : event.maxParticipants !== undefined
                          ? `0/${event.maxParticipants} participants`
                          : event.currentParticipants !== undefined
                            ? `${event.currentParticipants} participants`
                            : event.participants || "Open registration"}
                    </span>

                    {/* Show warning icon if almost full (80% or more) */}
                    {event.maxParticipants &&
                      event.currentParticipants &&
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
                  {event.results.score && (
                    <p className="text-sm">
                      Final score: <span className="font-medium">{event.results.score}</span>
                    </p>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>

              <div className="inline-flex items-center text-sky-600 font-medium">
                {event.isPast ? "View Recap" : "View Details"} <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-600">No events found</h3>
          <p className="text-gray-500 mt-2">
            {timeFilter === "upcoming"
              ? "No upcoming events match your filter. Try a different category or check back later."
              : timeFilter === "past"
                ? "No past events match your filter. Try a different category."
                : "No events match your filter. Try changing your selection."}
          </p>
        </div>
      )}
    </div>
  )
}
