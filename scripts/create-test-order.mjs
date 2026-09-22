/**
 * Script tao Order thu cong qua Store API
 *
 * Flow: Tao Cart -> Them san pham -> Complete Cart -> order.placed event!
 *
 * Chay bang: node scripts/create-test-order.mjs
 */

const BASE_URL = "http://localhost:9000"
const API_KEY = "pk_ec8347a711876181318f6f5e6becba939cbc48fb79bb7e308b4b4d0853940cc1"

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": API_KEY,
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`ERROR ${res.status}:`, JSON.stringify(data, null, 2))
    throw new Error(`API call failed: ${path}`)
  }
  return data
}

async function main() {
  console.log("\n=== TAO TEST ORDER ===\n")

  // 1. Lay danh sach san pham
  console.log("1. Lay danh sach san pham...")
  const { products } = await api("/store/products")
  const product = products[0]
  const variant = product.variants[0]
  console.log(`   San pham: ${product.title}`)
  console.log(`   Variant: ${variant.title} (ID: ${variant.id})`)

  // 2. Lay region
  console.log("\n2. Lay region...")
  const { regions } = await api("/store/regions")
  const region = regions[0]
  console.log(`   Region: ${region.name} (ID: ${region.id})`)

  // 3. Tao Cart
  console.log("\n3. Tao Cart...")
  const { cart } = await api("/store/carts", {
    method: "POST",
    body: JSON.stringify({ region_id: region.id }),
  })
  console.log(`   Cart ID: ${cart.id}`)

  // 4. Them san pham vao Cart
  console.log("\n4. Them san pham vao Cart...")
  const { cart: cartWithItems } = await api(`/store/carts/${cart.id}/line-items`, {
    method: "POST",
    body: JSON.stringify({
      variant_id: variant.id,
      quantity: 2,
    }),
  })
  console.log(`   Da them ${cartWithItems.items.length} item(s)`)

  // 5. Dien thong tin email
  console.log("\n5. Cap nhat email khach hang...")
  await api(`/store/carts/${cart.id}`, {
    method: "POST",
    body: JSON.stringify({
      email: "customer@test.com",
    }),
  })
  console.log("   Email: customer@test.com")

  // 6. Lay shipping options
  console.log("\n6. Lay shipping options...")
  const { shipping_options } = await api(
    `/store/shipping-options?cart_id=${cart.id}`
  )

  if (shipping_options.length > 0) {
    const shippingOption = shipping_options[0]
    console.log(`   Shipping: ${shippingOption.name} (ID: ${shippingOption.id})`)

    // 7. Them shipping method
    console.log("\n7. Them shipping method...")
    await api(`/store/carts/${cart.id}/shipping-methods`, {
      method: "POST",
      body: JSON.stringify({
        option_id: shippingOption.id,
      }),
    })
    console.log("   Shipping method added!")
  } else {
    console.log("   Khong co shipping option, bo qua...")
  }

  // 8. Dien billing address
  console.log("\n8. Cap nhat dia chi...")
  await api(`/store/carts/${cart.id}`, {
    method: "POST",
    body: JSON.stringify({
      shipping_address: {
        first_name: "Test",
        last_name: "Customer",
        address_1: "123 Test Street",
        city: "Ho Chi Minh",
        country_code: region.countries?.[0]?.iso_2 || "us",
        postal_code: "70000",
      },
      billing_address: {
        first_name: "Test",
        last_name: "Customer",
        address_1: "123 Test Street",
        city: "Ho Chi Minh",
        country_code: region.countries?.[0]?.iso_2 || "us",
        postal_code: "70000",
      },
    }),
  })
  console.log("   Dia chi da cap nhat!")

  // 9. Lay payment providers
  console.log("\n9. Lay payment providers...")
  const { payment_providers } = await api(
    `/store/payment-providers?region_id=${region.id}`
  )

  const providerId = payment_providers?.[0]?.id || "pp_system_default"
  console.log(`   Provider: ${providerId}`)

  // 10. Khoi tao payment collection + session
  console.log("\n10. Khoi tao payment...")

  // Init payment collection
  const initPaymentRes = await fetch(`${BASE_URL}/store/payment-collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": API_KEY,
    },
    body: JSON.stringify({ cart_id: cart.id }),
  })
  const paymentData = await initPaymentRes.json()

  if (paymentData.payment_collection) {
    const pcId = paymentData.payment_collection.id
    console.log(`    Payment Collection ID: ${pcId}`)

    try {
      await api(`/store/payment-collections/${pcId}/payment-sessions`, {
        method: "POST",
        body: JSON.stringify({
          provider_id: providerId,
        }),
      })
      console.log("    Payment session created!")
    } catch (e) {
      console.log("    Payment session error:", e.message)
    }
  } else {
    console.log("    Payment init response:", JSON.stringify(paymentData, null, 2))
  }

  // 11. Complete Cart -> TAO ORDER!
  console.log("\n11. COMPLETING CART -> TAO ORDER...")
  try {
    const result = await api(`/store/carts/${cart.id}/complete`, {
      method: "POST",
    })

    if (result.type === "order") {
      console.log("\n========================================")
      console.log("  ORDER CREATED SUCCESSFULLY!")
      console.log(`  Order ID: ${result.order.id}`)
      console.log(`  Order Number: ${result.order.display_id}`)
      console.log("========================================")
      console.log("\n=> Kiem tra terminal Medusa server de thay event log!")
    } else {
      console.log("\nResult:", JSON.stringify(result, null, 2))
    }
  } catch (e) {
    console.log("\nLoi khi complete cart.")
    console.log("Error:", e.message)
  }
}

main().catch(console.error)
