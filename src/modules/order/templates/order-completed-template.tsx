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

const DetailRow = ({ label, value, className = "" }: { label: string; value: string | number; className?: string }) => (
  <div className="flex items-center gap-4">
    <span className="text-muted-foreground font-medium">{label}:</span>
    <span className={className}>{value}</span>
  </div>
)

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
            <div>
              <Text className="text-lg font-semibold text-primary mb-4">
                Technician Details
              </Text>
              <div className="grid gap-4">
                <DetailRow label="ID" value={`${(order as any).technician.id}`} />
                <DetailRow label="Name" value={`${(order as any).technician.name}`} />
                <DetailRow label="Email" value={`${(order as any).technician.email}`} />
                <DetailRow
                  label="Booking ID"
                  value={`${orderMetadata.metadata?.nylasBookingId}`}
                  className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-sm"
                />
                <div className="flex items-start gap-4">
                  <span className="text-muted-foreground font-medium">Time Slot:</span>
                  <div className="flex flex-col text-sm">
                    <span>
                      {format(new Date(Number(orderMetadata.metadata?.startTime) * 1000), "EEEE, MMMM d, yyyy")}
                    </span>
                    <span>
                      {`${format(new Date(Number(orderMetadata.metadata?.startTime) * 1000), "h:mm a")} - ${format(new Date(Number(orderMetadata.metadata?.endTime) * 1000), "h:mm a")}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Divider className="mt-10" />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          <Help />
        </div>
      </div>
    </div>
  )
}
