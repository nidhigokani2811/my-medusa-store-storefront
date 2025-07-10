"use client"

import SchedularComponent from "@lib/components/comp-505"
import { updateCart } from "@lib/data/cart"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, Heading, Text, clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { format, getUnixTime } from "date-fns"
import { getTerritories } from "@lib/data/customer"
import { getTodayBooking } from "@lib/data/orders"

interface TechnicianData {
  email: string
  name: string
  booking: {
    calendar_id: string
  }
  timezone: string
  availability: {
    open_hours: Array<{
      end: string
      days: number[]
      start: string
      timezone: string
    }>
    calendar_ids: string[]
  }
}

interface Territory {
  id: number
  name: string
  open_hours: TechnicianData[]
  polygon: Array<any>
  properties: {
    id: string
    name: string
    color: string
    opacity: number
    timeZone: string
  }
  appearance: {
    vacation: string
  }
  createdAt: string
  updatedAt: string
  type: string
}

type SchedularProps = {
  cart: HttpTypes.StoreCart
}

const Schedular: React.FC<SchedularProps> = ({ cart }) => {
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<{
    start: string
    end: string
    time: string
    period: string
    type: "flex" | "exact"
  } | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "schedular"

  const handleSelectionChange = (
    date: Date | null,
    time: {
      start: string
      end: string
      time: string
      period: string
      type: "flex" | "exact"
    } | null
  ) => {
    if (date && (!selectedDate || date.getTime() !== selectedDate.getTime())) {
      setSelectedDate(date)
    }

    if (
      time &&
      (!selectedTime ||
        time.start !== selectedTime.start ||
        time.end !== selectedTime.end)
    ) {
      setSelectedTime(time)
    }
  }

  const handleSubmit = async () => {
    const territories = await getTerritories()

    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time slot.")
      return
    }

    try {
      const todayBooking = await getTodayBooking(selectedDate)

      const visits: Record<string, any> = {}
      const fleet: Record<string, any> = {}

      // Track all territory names that have orders
      const territoriesWithOrders = new Set<string>()

      // Add current cart's territory
      if (cart.metadata?.territory_name) {
        territoriesWithOrders.add(cart.metadata.territory_name as string)
      }

      // Process existing bookings
      if (todayBooking && todayBooking.length > 0) {
        todayBooking.forEach((booking: any) => {
          visits[`${booking.order.id}`] = {
            location: {
              name: `${booking.order.shipping_address?.id}`,
              lat: Number(booking?.latitude) || 0,
              lng: Number(booking?.longitude) || 0,
            },
            start: booking.start_time
              ? format(new Date(Number(booking.start_time) * 1000), "HH:mm")
              : "",
            end: booking.end_time
              ? format(new Date(Number(booking.end_time) * 1000), "HH:mm")
              : "",
            duration: booking.duration,
          }

          // Get territory name for this order from the booking response
          const orderTerritoryName = booking.order.metadata?.territory_name
          if (orderTerritoryName) {
            territoriesWithOrders.add(orderTerritoryName)
          }
        })
      }

      // Add current cart items
      if (cart.items && cart.items.length > 0) {
        cart.items.forEach((item, index) => {
          visits[`order_item_${index + 1}`] = {
            location: {
              name: cart.shipping_address?.address_1,
              lat: Number(cart.metadata?.latitude),
              lng: Number(cart.metadata?.longitude),
            },
            start: selectedTime
              ? format(new Date(Number(selectedTime.start) * 1000), "HH:mm")
              : "",
            end: selectedTime
              ? format(new Date(Number(selectedTime.end) * 1000), "HH:mm")
              : "",
            duration: Number(cart.metadata?.duration),
          }
        })
      }

      const selectedDay = selectedDate.getDay()
      // Build fleet data for ALL territories that have orders
      for (const territoryName of Array.from(territoriesWithOrders)) {
        const selectedTerritory = territories.find((territory: Territory) => {
          return territory.name === territoryName
        })

        if (selectedTerritory && selectedTerritory.open_hours) {
          selectedTerritory.open_hours.forEach(
            (technicianData: TechnicianData) => {
              const hoursForSelectedDay =
                technicianData.availability.open_hours.filter((hours) =>
                  hours.days.includes(selectedDay)
                )

              if (hoursForSelectedDay.length > 0) {
                const fleetKey = `${technicianData.name}_${selectedTerritory.name}`
                fleet[fleetKey] = {
                  start_location: {
                    id: "depot",
                    name: "Service Depot",
                    lat: 28.732488,
                    lng: -81.364498,
                  },
                  end_location: {
                    id: "depot",
                    name: "Service Depot",
                    lat: 28.732488,
                    lng: -81.364498,
                  },
                  shift_start: hoursForSelectedDay[0].start,
                  shift_end: hoursForSelectedDay[0].end,
                }
              }
            }
          )
        }
      }

      console.log("Routific API Request Body:", { visits, fleet })

      // Call Routific API with real data
      const routificResponse = await fetch("https://api.routific.com/v1/vrp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ROUTIFIC_TOKEN}`,
        },
        body: JSON.stringify({
          visits,
          fleet,
        }),
      })

      const routificData = await routificResponse.json()
      console.log("Routific API Response:", routificData)

      if (!routificResponse.ok) {
        throw new Error(
          `Routific API error: ${routificData.message || "Unknown error"}`
        )
      }

      if (routificData.unserved) {
        setError("No time slots available for the selected date and time.")
        return
      }

      if (selectedTime?.start && selectedTime?.end) {
        await updateCart({
          metadata: {
            startTime: selectedTime.start,
            endTime: selectedTime.end,
            bookingType: selectedTime?.type,
          },
        })
        router.push(pathname + "?step=delivery", { scroll: false })
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Failed to process request. Please try again.")
    }
  }

  const handleEdit = () => {
    router.push(pathname + "?step=schedular", { scroll: false })
  }

  useEffect(() => {
    if (cart.metadata?.startTime && cart.metadata?.endTime && isOpen) {
      const newDate = new Date(Number(cart.metadata?.startTime) * 1000)
      const newTime = {
        start: `${cart.metadata?.startTime}`,
        end: `${cart.metadata?.endTime}`,
        time: `${format(
          new Date(Number(cart.metadata?.startTime) * 1000),
          "HH:mm"
        )} - ${format(
          new Date(Number(cart.metadata?.endTime) * 1000),
          "HH:mm"
        )}`,
        period: `${cart.metadata?.period}`,
        type: (cart.metadata?.bookingType as "flex" | "exact") || "flex",
      }

      if (!selectedDate || newDate.getTime() !== selectedDate.getTime()) {
        setSelectedDate(newDate)
      }
      if (
        !selectedTime ||
        newTime.start !== selectedTime.start ||
        newTime.end !== selectedTime.end
      ) {
        setSelectedTime(newTime)
      }
    }
    setError(null)
  }, [isOpen, cart.metadata])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline"
          )}
        >
          Schedular
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                Edit
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-medium txt-medium text-ui-fg-base">
                Select a date and time
              </span>
              <span className="mb-4 text-ui-fg-muted txt-medium">
                How would you like your order delivered?
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                <SchedularComponent
                  onSelectionChange={handleSelectionChange}
                  selectedTime={selectedTime}
                  selectedDate={selectedDate}
                  cartId={cart.id}
                  cart={cart}
                />
              </div>
            </div>
          </div>

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="mt"
              onClick={handleSubmit}
              disabled={!selectedDate || !selectedTime}
              data-testid="submit-delivery-option-button"
            >
              Continue to delivery
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && cart.metadata?.startTime && cart.metadata?.endTime ? (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Scheduled Time
                </Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {format(
                    new Date(Number(cart.metadata?.startTime) * 1000),
                    "dd/MM/yyyy HH:mm"
                  )}{" "}
                  -{" "}
                  {format(
                    new Date(Number(cart.metadata?.endTime) * 1000),
                    "dd/MM/yyyy HH:mm"
                  )}
                </Text>
              </div>
            ) : (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Select a date and time
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Schedular
