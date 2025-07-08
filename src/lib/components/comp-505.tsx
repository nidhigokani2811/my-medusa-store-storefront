"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { format } from "date-fns"

import { Button } from "@lib/components/ui/button"
import { Calendar } from "@lib/components/ui/calendar"
import { ScrollArea } from "@lib/components/ui/scroll-area"
import { cn } from "@lib/utils"
import { getTerritories, getTimeSlots } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"

type TimeSlot = {
  start_time: number
  end_time: number
  emails: string[]
}

type BookingType = "flex" | "exact"

type BookingSlot = {
  type?: BookingType
  startTime: string
  endTime?: string
  period: "Morning" | "Afternoon" | "Evening"
  technicianEmail: string[]
}

type SelectedTime = {
  start: string
  end: string
  time: string
  technicianEmail: string
  period: string
  type: BookingType
} | null

type SchedularComponentProps = {
  onSelectionChange?: (date: Date | null, time: SelectedTime) => void
  selectedTime?: SelectedTime
  selectedDate?: Date | null
  cartId?: string
  cart: HttpTypes.StoreCart
}

// Utility functions moved outside component
const convertTimeToUnix = (timeStr: string, date: Date, timezone: string): number => {
  const dateStr = `${format(date, 'yyyy-MM-dd')} ${timeStr}`
  const localDate = new Date(dateStr)
  return Math.floor(localDate.getTime() / 1000)
}

const isDateExcluded = (date: Date, exdates?: string[]): boolean => {
  if (!exdates) return false
  const dateStr = format(date, 'yyyy-MM-dd')
  return exdates.includes(dateStr)
}

export default function SchedularComponent({
  onSelectionChange,
  selectedTime,
  selectedDate,
  cartId,
  cart,
}: SchedularComponentProps) {
  const today = useMemo(() => new Date(), [])
  const [date, setDate] = useState<Date>(selectedDate || today)
  const [time, setTime] = useState<SelectedTime>(selectedTime || null)
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [prevDuration, setPrevDuration] = useState<number>(0)

  const duration = useMemo(() => parseInt(cart.metadata?.duration as string) || 60, [cart.metadata?.duration])

  // Fetch availability and create booking slots
  const fetchAvailability = useCallback(async (selectedDate: Date) => {
    setLoading(true)
    try {
      const territories = await getTerritories()
      const territory = territories.find((t: any) => t.name === cart.metadata?.territory_name)
      if (!territory) return

      const dayOfWeek = selectedDate.getDay()
      const groups: Record<string, BookingSlot[]> = {
        Morning: [],
        Afternoon: [],
        Evening: []
      }

      territory.open_hours.forEach((tech: any) => {
        tech.availability.open_hours
          .filter((hour: any) => hour.days.includes(dayOfWeek) && !isDateExcluded(selectedDate, hour.exdates))
          .forEach((hour: any) => {
            const startTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${hour.start}`)
            const endTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${hour.end}`)
            const startHourOfDay = startTime.getHours()
            const endHourOfDay = endTime.getHours()

            // Helper function to add flex booking to a group
            const addToGroup = (group: string, start: number, end: number) => {
              const groupStartTime = new Date(startTime)
              const groupEndTime = new Date(startTime)
              groupStartTime.setHours(start, 0, 0)
              groupEndTime.setHours(end, 0, 0)

              // Create a unique key for flex booking
              const flexKey = `${format(groupStartTime, "HH:mm")}-${format(groupEndTime, "HH:mm")}-flex`
              if (!groups[group].some(slot =>
                slot.type === "flex" &&
                slot.startTime === format(groupStartTime, "HH:mm") &&
                slot.endTime === format(groupEndTime, "HH:mm")
              )) {
                groups[group].push({
                  type: "flex",
                  startTime: format(groupStartTime, "HH:mm"),
                  endTime: format(groupEndTime, "HH:mm"),
                  period: group as "Morning" | "Afternoon" | "Evening",
                  technicianEmail: [tech.email]
                })
              }

              // Add exact bookings for this group with 30-minute buffer
              let currentSlot = new Date(groupStartTime)
              const bufferTime = 30 * 60 * 1000 // 30 minutes in milliseconds

              while (currentSlot.getTime() + (duration * 60 * 1000) <= groupEndTime.getTime()) {
                const exactTime = format(currentSlot, "HH:mm")
                // Check if this exact time slot already exists
                if (!groups[group].some(slot =>
                  slot.type === "exact" &&
                  slot.startTime === exactTime
                )) {
                  groups[group].push({
                    type: "exact",
                    startTime: exactTime,
                    period: group as "Morning" | "Afternoon" | "Evening",
                    technicianEmail: [tech.email]
                  })
                }
                // Move to next slot: current duration + buffer time
                currentSlot = new Date(currentSlot.getTime() + (duration * 60 * 1000) + bufferTime)
              }
            }

            // Split into groups based on time ranges
            if (startHourOfDay < 12 && endHourOfDay >= 12) {
              addToGroup('Morning', startHourOfDay, 12)
              if (endHourOfDay < 18) {
                addToGroup('Afternoon', 12, endHourOfDay)
              } else {
                addToGroup('Afternoon', 12, 18)
                addToGroup('Evening', 18, endHourOfDay)
              }
            } else if (startHourOfDay < 18 && endHourOfDay >= 18) {
              addToGroup('Afternoon', startHourOfDay, 18)
              addToGroup('Evening', 18, endHourOfDay)
            } else {
              const period = startHourOfDay >= 18 ? 'Evening'
                : startHourOfDay >= 12 ? 'Afternoon'
                  : 'Morning'
              addToGroup(period, startHourOfDay, endHourOfDay)
            }
          })
      })

      // Flatten and sort all slots
      const allSlots = Object.values(groups).flat()
      setBookingSlots(allSlots.sort((a, b) => {
        const timeA = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${a.startTime}`).getTime()
        const timeB = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${b.startTime}`).getTime()
        return timeA - timeB
      }))
      setPrevDuration(duration)
    } catch (error) {
      console.error("Error fetching availability:", error)
      setBookingSlots([])
    } finally {
      setLoading(false)
    }
  }, [cart.metadata?.territory_name, duration])

  // Group slots by period for display
  const groupedSlots = useMemo(() => {
    const groups: Record<string, BookingSlot[]> = {
      Morning: [],
      Afternoon: [],
      Evening: []
    }

    bookingSlots.forEach(slot => {
      groups[slot.period].push(slot)
    })

    return Object.entries(groups)
      .filter(([_, slots]) => slots.length > 0)
      .map(([period]) => ({
        period: period as "Morning" | "Afternoon" | "Evening",
        slots: groups[period]
      }))
  }, [bookingSlots])

  // Handle booking selection
  const handleBookingSelection = useCallback((slot: BookingSlot) => {
    setTime({
      start: String(new Date(`${format(date, 'yyyy-MM-dd')} ${slot.startTime}`).getTime() / 1000),
      end: slot.endTime
        ? String(new Date(`${format(date, 'yyyy-MM-dd')} ${slot.endTime}`).getTime() / 1000)
        : String(new Date(`${format(date, 'yyyy-MM-dd')} ${slot.startTime}`).getTime() / 1000 + duration * 60),
      time: slot.endTime ? `${slot.startTime} - ${slot.endTime}` : slot.startTime,
      technicianEmail: slot.technicianEmail[0],
      period: slot.period,
      type: slot?.type || "flex"
    })
  }, [date, duration])

  // Effects
  useEffect(() => {
    if (selectedTime && selectedDate) {
      setTime(selectedTime)
      setDate(selectedDate)
    }
  }, [selectedTime, selectedDate])

  useEffect(() => {
    // Fetch if date changes, duration changes, or no slots exist
    if (date) {
      fetchAvailability(date)
    }
  }, [date, duration, fetchAvailability])

  useEffect(() => {
    // Only notify parent if there's an actual change
    if (date && time && (
      !selectedDate ||
      !selectedTime ||
      date.getTime() !== selectedDate.getTime() ||
      time.start !== selectedTime.start
    )) {
      onSelectionChange?.(date, time)
    }
  }, [date, time, onSelectionChange, selectedDate, selectedTime])

  const PeriodIcon = ({ period }: { period: string }) => {
    switch (period) {
      case "Morning":
        return <span className="text-xl">🌅</span>
      case "Afternoon":
        return <span className="text-xl">☀️</span>
      case "Evening":
        return <span className="text-xl">🌙</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="flex max-sm:flex-col">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(newDate)
                setTime(null)
              }
            }}
            className="p-2 sm:pe-5"
            components={{}}
          />
          <div className="relative w-full max-sm:h-[500px] sm:w-80">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-6 px-5">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-sm text-gray-600">
                        Loading time slots...
                      </span>
                    </div>
                  ) : groupedSlots.length > 0 ? (
                    groupedSlots.map((group) => (
                      <div key={group.period} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <PeriodIcon period={group.period} />
                          <h3 className="text-base font-semibold text-gray-900">{group.period}</h3>
                        </div>
                        <div className="space-y-3">
                          {group.slots.map((slot, index) => (
                            <label
                              key={`${slot.startTime}-${index}`}
                              className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50"
                            >
                              <input
                                type="radio"
                                name="bookingSlot"
                                className="mt-1 h-4 w-4 text-blue-600"
                                checked={time?.time === (slot.endTime ? `${slot.startTime} - ${slot.endTime}` : slot.startTime)}
                                onChange={() => handleBookingSelection(slot)}
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {slot.endTime ? `${slot.startTime} - ${slot.endTime}` : slot.startTime}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {slot.type === "flex" ? "Flex Booking" : "Exact Booking"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No time slots available for this date
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}