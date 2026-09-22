import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function orderPlacedHandler({
  event,
}: SubscriberArgs<Record<string, unknown>>) {
  console.log("===================================")
  console.log("ORDER PLACED EVENT RECEIVED!")
  console.log("Event name:", event.name)
  console.log("Event data:", JSON.stringify(event.data, null, 2))
  console.log("===================================")
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
