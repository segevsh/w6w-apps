import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Get Customer — Fetch one customer, including its custom fields.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer, including its custom fields.",
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot customer id (from List Customers).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "channel_id", type: "number", label: "Channel ID" },
    { key: "archived", type: "boolean", label: "Archived" },
    { key: "agent_id", type: "number", label: "Assigned agent ID, null if none" },
    { key: "unread", type: "boolean", label: "Unread" },
    { key: "last_message", type: "number", label: "Last message (Unix time)" },
    { key: "register_date", type: "number", label: "Registered (Unix time)" },
    { key: "custom_fields", type: "object", label: "Custom fields keyed by name" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).get(`/customers/${encodeId(input.customerId)}/`, "customer");
  },
};

export default customerGet;
