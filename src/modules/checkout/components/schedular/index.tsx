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
import { format } from "date-fns"

type SchedularProps = {
    cart: HttpTypes.StoreCart
}

const Schedular: React.FC<SchedularProps> = ({
    cart
}) => {
    const [error, setError] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<{ start: string, end: string, time: string, technicianEmail: string } | null>(null)

    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const isOpen = searchParams.get("step") === "schedular"

    const handleSelectionChange = (date: Date | null, time: { start: string, end: string, time: string, technicianEmail: string } | null) => {
        setSelectedDate(date)
        setSelectedTime(time)
    }

    const handleSubmit = async () => {
        if (selectedDate && selectedTime) {
            await updateCart({
                metadata: {
                    startTime: selectedTime.start,
                    endTime: selectedTime.end,
                    technicianEmail: selectedTime.technicianEmail
                }
            })
            router.push(pathname + "?step=delivery", { scroll: false })
        }
    }

    const handleEdit = () => {
        router.push(pathname + "?step=schedular", { scroll: false })
    }

    useEffect(() => {
        if (cart.metadata?.startTime && cart.metadata?.endTime) {
            setSelectedDate(new Date(Number(cart.metadata?.startTime) * 1000))
            setSelectedTime({
                start: `${cart.metadata?.startTime}`,
                end: `${cart.metadata?.endTime}`,
                time: `${format(new Date(Number(cart.metadata?.startTime) * 1000), 'HH:mm')} - ${format(new Date(Number(cart.metadata?.endTime) * 1000), 'HH:mm')}`,
                technicianEmail: `${cart.metadata?.technicianEmail}`
            })
        }
        setError(null)
    }, [isOpen])

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
                                <SchedularComponent onSelectionChange={handleSelectionChange} selectedTime={selectedTime} selectedDate={selectedDate} cartId={cart.id} />
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
                        {cart && (cart.metadata?.startTime && cart.metadata?.endTime) ? (
                            <div className="flex flex-col w-1/3">
                                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                                    Scheduled Time
                                </Text>
                                <Text className="txt-medium text-ui-fg-subtle">
                                    {format(new Date(Number(cart.metadata?.startTime) * 1000), 'dd/MM/yyyy HH:mm')} - {format(new Date(Number(cart.metadata?.endTime) * 1000), 'dd/MM/yyyy HH:mm')}
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
