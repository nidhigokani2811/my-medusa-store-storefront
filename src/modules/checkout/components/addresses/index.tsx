"use client"

import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text, useToggleState, Select } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { useEffect, useState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

// Add Territory type
type Territory = {
  id: number
  name: string
  polygon: Array<{
    id: string
    lat: number
    lng: number
  }>
  properties: {
    name: string
    color: string
    borderColor: string
  }
}

const Addresses = ({
  cart,
  customer,
  territories,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  territories: Territory[]
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [selectedTerritory, setSelectedTerritory] = useState<string>("")

  // Add this useEffect to set the default territory value
  useEffect(() => {
    if (cart?.metadata?.territory_id && territories.length > 0) {
      // Find the territory that matches the cart's territory_id
      const defaultTerritory = territories.find(
        (territory) => territory.id.toString() === cart.metadata.territory_id
      )
      if (defaultTerritory) {
        setSelectedTerritory(defaultTerritory.id.toString())
      }
    }
  }, [cart?.metadata?.territory_id, territories])

  const isOpen = searchParams.get("step") === "address"

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
        >
          Shipping Address
          {!isOpen && <CheckCircleSolid />}
        </Heading>
        {!isOpen && cart?.shipping_address && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-address-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      {isOpen ? (
        <form action={formAction}>
          <div className="pb-8">
            {/* Add Territory Select Dropdown */}
            <div className="mb-4">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Select Territory
              </Text>
              <Select
                value={selectedTerritory}
                onValueChange={setSelectedTerritory}
                data-testid="territory-select"
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select a territory" />
                </Select.Trigger>
                <Select.Content>
                  {territories.map((territory) => (
                    <Select.Item key={territory.id} value={territory.id.toString()}>
                      {territory.name.charAt(0).toUpperCase() + territory.name.slice(1)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            {/* Hidden fields for territory id and name */}
            <input
              type="hidden"
              name="territory_id"
              value={selectedTerritory}
            />
            <input
              type="hidden"
              name="territory_name"
              value={territories.find(t => t.id.toString() === selectedTerritory)?.name || ""}
            />

            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div>
                <Heading
                  level="h2"
                  className="text-3xl-regular gap-x-4 pb-6 pt-8"
                >
                  Billing address
                </Heading>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton className="mt-6" data-testid="submit-address-button">
              Continue to Schedular
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && cart.shipping_address ? (
              <div className="flex items-start gap-x-8">
                <div className="flex items-start gap-x-1 w-full">
                  <div
                    className="flex flex-col w-1/3"
                    data-testid="shipping-address-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      Shipping Address
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.first_name}{" "}
                      {cart.shipping_address.last_name}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.address_1}{" "}
                      {cart.shipping_address.address_2}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.postal_code},{" "}
                      {cart.shipping_address.city}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.country_code?.toUpperCase()}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {"Territory: " + ((cart?.metadata?.territory_name as string)
                        ?.charAt(0).toUpperCase() + (cart.metadata?.territory_name as string)?.slice(1)) || "No territory selected"}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {"Latitude: " + (cart?.metadata?.latitude != null ? String(cart.metadata.latitude) : "No latitude")}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {"Longitude: " + (cart?.metadata?.longitude != null ? String(cart.metadata.longitude) : "No longitude")}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {"Duration: " + (cart?.metadata?.duration != null ? String(cart.metadata.duration) : "No duration")}
                    </Text>
                  </div>

                  <div
                    className="flex flex-col w-1/3 "
                    data-testid="shipping-contact-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      Contact
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.phone}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.email}
                    </Text>
                  </div>

                  <div
                    className="flex flex-col w-1/3"
                    data-testid="billing-address-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      Billing Address
                    </Text>

                    {sameAsBilling ? (
                      <Text className="txt-medium text-ui-fg-subtle">
                        Billing- and delivery address are the same.
                      </Text>
                    ) : (
                      <>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.first_name}{" "}
                          {cart.billing_address?.last_name}
                        </Text>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.address_1}{" "}
                          {cart.billing_address?.address_2}
                        </Text>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.postal_code},{" "}
                          {cart.billing_address?.city}
                        </Text>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.country_code?.toUpperCase()}
                        </Text>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Spinner />
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Addresses
