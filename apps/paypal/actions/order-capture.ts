import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/**
 * Capture payment for an order. Wraps `POST /v2/checkout/orders/{id}/capture`.
 *
 * `PayPal-Request-Id` is PayPal's own idempotency key for this endpoint (it
 * documents `PAYPAL_REQUEST_ID_REQUIRED` as a validation error for payment
 * processing) — keyed off the invocation so a retried step doesn't double
 * charge. `Prefer: return=representation` asks for the full capture body back
 * rather than PayPal's minimal id+status+links default.
 */
const action: ActionDefinition = {
  key: "order-capture",
  type: "perform",
  resource: "order",
  title: "Capture an order",
  description: "Capture payment for an order that has been approved by the payer.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "purchase_units", type: "array", label: "Purchase units, including capture details" },
  ],

  async execute(input, ctx) {
    const orderId = String((input as Record<string, unknown>).orderId ?? "").trim();
    if (!orderId) throw new Error("`orderId` is required");

    ctx.log("info", "capturing PayPal order", { orderId });

    return await new PayPalClient(ctx).request(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      body: {},
      headers: {
        prefer: "return=representation",
        ...(ctx.invocation?.invocationId
          ? { "paypal-request-id": ctx.invocation.invocationId }
          : {}),
      },
    });
  },
};

export default action;
