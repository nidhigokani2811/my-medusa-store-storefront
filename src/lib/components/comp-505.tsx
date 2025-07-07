"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"

import { Button } from "@lib/components/ui/button"
import { Calendar } from "@lib/components/ui/calendar"
import { ScrollArea } from "@lib/components/ui/scroll-area"
import { cn } from "@lib/utils"
import { getTimeSlots } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"

type TimeSlot = {
  start_time: number
  end_time: number
  emails: string[]
}

type AvailabilityResponse = {
  request_id: string
  data: {
    order: string[]
    time_slots: TimeSlot[]
  }
}

type SchedularComponentProps = {
  onSelectionChange?: (date: Date | null, time: { start: string, end: string, time: string, technicianEmail: string } | null) => void
  selectedTime?: { start: string, end: string, time: string, technicianEmail: string } | null
  selectedDate?: Date | null
  cartId?: string
  cart: HttpTypes.StoreCart
}

export default function SchedularComponent({ onSelectionChange, selectedTime, selectedDate, cartId, cart }: SchedularComponentProps) {
  const today = new Date()
  const [date, setDate] = useState<Date>(selectedDate || today)
  const [time, setTime] = useState<{ start: string, end: string, time: string, technicianEmail: string } | null>(selectedTime || null)
  const [timeSlots, setTimeSlots] = useState<{ time: string; available: boolean, start: string, end: string, technicianEmail: string[] }[]>([])
  const [loading, setLoading] = useState(false)

  const [technicianEmailPriority, setTechnicianEmailPriority] = useState<string>("")
  const fetchAvailability = async (selectedDate: Date) => {
    setLoading(true)
    try {
      // Convert date to Unix timestamp (start of day)
      const startTime = Math.floor(selectedDate.setHours(0, 0, 0, 0) / 1000)
      const endTime = startTime + 86400 // Add 24 hours in seconds

      // If date is today, adjust startTime to be 60 minutes from now and round to nearest 5 minutes
      const currentTime = Math.floor(Date.now() / 1000)
      const adjustedStartTime = selectedDate.toDateString() === new Date().toDateString()
        ? Math.ceil((Math.max(startTime, currentTime + 3600)) / 300) * 300 // Round up to nearest 5 minutes (300 seconds)
        : Math.ceil(startTime / 300) * 300 // Round up to nearest 5 minutes (300 seconds)

      const response = await getTimeSlots(endTime, adjustedStartTime, cartId || "", cart)

      // Convert time slots to our format
      const formattedTimeSlots = (response as AvailabilityResponse).data.time_slots.map((slot: TimeSlot) => ({
        time: `${format(new Date(slot.start_time * 1000), 'HH:mm')} - ${format(new Date(slot.end_time * 1000), 'HH:mm')}`,
        start: `${slot.start_time}`,
        end: `${slot.end_time}`,
        available: true,
        technicianEmail: slot.emails
      }))
      setTechnicianEmailPriority(response.data.order[0])
      setTimeSlots(formattedTimeSlots)
    } catch (error) {
      console.error('Error fetching availability:', error)
      setTimeSlots([])
    } finally {
      setLoading(false)
    }
  }

  // Effect for initial values
  useEffect(() => {
    if (selectedTime) {
      setTime(selectedTime)
    }
    if (selectedDate) {
      setDate(selectedDate)
    }
  }, [selectedTime, selectedDate])

  // Effect for fetching availability when date changes
  useEffect(() => {
    fetchAvailability(date)
  }, [date])

  // Effect for notifying parent of changes
  useEffect(() => {
    onSelectionChange?.(date, time)
  }, [date, time])

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
          <div className="relative w-full max-sm:h-48 sm:w-40">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-3">
                  <div className="flex h-5 shrink-0 items-center px-5">
                    <p className="text-sm font-medium">
                      {format(date, "EEEE, d")}
                    </p>
                  </div>
                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {loading ? (
                      // Loading state
                      <div className="col-span-2 flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 borde r-b-2 border-gray-900"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading time slots...</span>
                      </div>
                    ) : timeSlots.length > 0 ? (
                      // Time slots
                      timeSlots.map(({ time: timeSlot, available, start, end, technicianEmail }) => (
                        <Button
                          key={timeSlot}
                          variant={time?.time === timeSlot ? "default" : "outline"}

                          size="sm"
                          className={cn(
                            "w-full transition-all duration-200",
                            time?.time === timeSlot && "bg-black text-white shadow-md scale-[1.02]"
                          )}
                          onClick={() => setTime({ start: start, end: end, time: timeSlot, technicianEmail: (technicianEmail.includes(technicianEmailPriority) ? technicianEmailPriority : technicianEmail[0]) })}
                          disabled={!available}>
                          {timeSlot}
                        </Button>
                      ))
                    ) : (
                      // No time slots available
                      <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                        No time slots available for this date
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
