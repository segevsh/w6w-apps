import type { ActionDefinition } from "@w6w/types";
import { API_V1, jsonParam, SquarespaceClient } from "../lib/client.ts";

/**
 * `POST /1.0/commerce/orders/{id}/fulfillments` — mark an order fulfilled.
 *
 * Answers **`204` with no body**, so the action reports `{ ok: true }`: the
 * vendor's success signal here is the absence of a failure.
 *
 * Both body members are optional per the operation's own schema
 * (`OrderFulfillmentRequest`: `shipments`, `shouldSendNotification`), so an
 * empty body is legal — and means "fulfilled, no tracking, no email". Sending
 * `shouldSendNotification: true` is what actually emails the customer; the
 * default is to send nothing.
 *
 * There is no `Idempotency-Key` on this endpoint and no key in the body, so a
 * replay appends a second fulfillment. That is why the action declares
 * `idempotent: false` — a runtime retry must not silently re-fulfill.
 */
interface Input {
  id: string;
  shipments?: unknown;
  shouldSendNotification?: boolean;
}

const fulfillOrder: ActionDefinition<Input, { ok: true }> = {
  key: "fulfill-order",
  type: "perform",
  resource: "order",
  title: "Fulfill Order",
  description:
    "Mark an order fulfilled, optionally recording shipments and notifying the customer. " +
    "Squarespace answers 204 with no body.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Order id",
      type: "string",
      required: true,
      placeholder: "585d498fdee9f31a60284a37",
      hint: "The order's `id` from List orders.",
    },
    {
      key: "shipments",
      label: "Shipments",
      type: "json",
      hint: "Array of `{carrierName, service, shipDate, trackingNumber, trackingUrl}` entries. " +
        "All five members are optional; omit the array entirely to fulfil without tracking.",
    },
    {
      key: "shouldSendNotification",
      label: "Notify the customer",
      type: "boolean",
      advanced: true,
      hint: "Send the shopper a fulfillment notification email. Defaults to sending nothing.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Squarespace accepted it (HTTP 204)" }],

  async execute(input, ctx) {
    const id = encodeURIComponent(String(input.id ?? "").trim());
    const body: Record<string, unknown> = {};
    const shipments = jsonParam<unknown>(input.shipments, "shipments");
    if (shipments !== undefined) body.shipments = shipments;
    if (input.shouldSendNotification !== undefined) {
      body.shouldSendNotification = input.shouldSendNotification;
    }

    await new SquarespaceClient(ctx).post<void>(
      `${API_V1}/commerce/orders/${id}/fulfillments`,
      body,
    );
    return { ok: true };
  },
};

export default fulfillOrder;
