import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Send Location — Send a map location.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  latitude: number;
  longitude: number;
}

const sendLocation: ActionDefinition<Input> = {
  key: "send-location",
  type: "perform",
  resource: "message",
  title: "Send Location",
  description: "Send a map location.",
  idempotent: false,
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot customer id (from List Customers).",
    },
    {
      "key": "latitude",
      "label": "Latitude",
      "type": "number",
      "required": true,
    },
    {
      "key": "longitude",
      "label": "Longitude",
      "type": "number",
      "required": true,
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/send_location/`, {
      method: "POST",
      body: { latitude: input.latitude, longitude: input.longitude },
    });
  },
};

export default sendLocation;
