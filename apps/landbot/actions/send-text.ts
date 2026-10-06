import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Send Text — Send a text message to a customer. A WhatsApp customer outside the 24-hour window needs a template instead.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  message: string;
}

const sendText: ActionDefinition<Input> = {
  key: "send-text",
  type: "perform",
  resource: "message",
  title: "Send Text",
  description:
    "Send a text message to a customer. A WhatsApp customer outside the 24-hour window needs a template instead.",
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
      "key": "message",
      "label": "Message",
      "type": "text",
      "required": true,
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/send_text/`, {
      method: "POST",
      body: { message: input.message },
    });
  },
};

export default sendText;
