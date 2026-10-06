import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Send Image — Send an image, by URL, with an optional caption.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  url: string;
  caption?: string;
}

const sendImage: ActionDefinition<Input> = {
  key: "send-image",
  type: "perform",
  resource: "message",
  title: "Send Image",
  description: "Send an image, by URL, with an optional caption.",
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
      "key": "url",
      "label": "Image URL",
      "type": "string",
      "required": true,
      "hint": "Publicly reachable image URL.",
    },
    {
      "key": "caption",
      "label": "Caption",
      "type": "string",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/send_image/`, {
      method: "POST",
      body: compact({ url: input.url, caption: input.caption }),
    });
  },
};

export default sendImage;
