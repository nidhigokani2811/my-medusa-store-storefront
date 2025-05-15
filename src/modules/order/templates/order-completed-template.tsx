import { Heading, Text, Divider } from "@medusajs/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"
import { format } from "date-fns"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
  orderMetadata: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
  orderMetadata,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-4 max-w-4xl h-full bg-white w-full py-10"
          data-testid="order-complete-container"
        >
          <Heading
            level="h1"
            className="flex flex-col gap-y-3 text-ui-fg-base text-3xl mb-4"
          >
            <span>Thank you!</span>
            <span>Your order was placed successfully.</span>
          </Heading>
          <OrderDetails order={order} />
          <Heading level="h2" className="flex flex-row text-3xl-regular">
            Summary
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          {(order as any)?.technician && (
            <div className="bg-gray-50 rounded-lg shadow-sm">
              <Heading level="h2" className="text-2xl font-semibold mb-6">
                Technician Information
              </Heading>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <Text className="txt-medium-plus text-ui-fg-base mb-2 font-semibold">
                    Technician Details
                  </Text>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">ID:</span>{" "}
                      <span className="text-ui-fg-subtle">{(order as any).technician.id}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Nylas Booking ID:</span>{" "}
                      <span className="text-ui-fg-subtle">{(orderMetadata as any).metadata?.nylasBookingId}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Name:</span>{" "}
                      <span className="text-ui-fg-subtle">{(order as any).technician.name}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Email:</span>{" "}
                      <span className="text-ui-fg-subtle">{(order as any).technician.email}</span>
                    </div>
                    <div>
                      <span className="font-semibold">TimeSlot:</span>{" "}
                      <span className="text-ui-fg-subtle">
                        {format(new Date(Number((orderMetadata as any).metadata?.startTime) * 1000), "dd/MM/yyyy HH:mm")}
                        {" - "}
                        {format(new Date(Number((orderMetadata as any).metadata?.endTime) * 1000), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <Text className="txt-medium-plus text-ui-fg-base mb-2 font-semibold">
                    Tenant Information
                  </Text>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Tenant ID:</span>{" "}
                      <span className="text-ui-fg-subtle">{(order as any).technician.tenant.id}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Divider className="mt-8" />
            </div>
          )}
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          <Help />
        </div>
      </div>
    </div>
  )
}
