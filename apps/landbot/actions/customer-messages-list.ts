import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Get Customer Messages — Return the complete conversation transcript for a customer. There is no pagination and no guaranteed order: sort by message_datetime if you need it chronological. The set of message types is open-ended.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerMessagesList: ActionDefinition<Input> = {
  key: "customer-messages-list",
  type: "read",
  resource: "customer",
  title: "Get Customer Messages",
  description:
    "Return the complete conversation transcript for a customer. There is no pagination and no guaranteed order: sort by message_datetime if you need it chronological. The set of message types is open-ended.",
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
    { key: "messages", type: "array", label: "Transcript messages" },
    { key: "count", type: "number", label: "Messages returned" },
  ],

  async execute(input, ctx) {
    const r = await new LandbotClient(ctx).list(
      `/customers/${encodeId(input.customerId)}/messages/`,
      "messages",
    );
    return { messages: r.messages, count: r.count };
  },
};

export default customerMessagesList;
