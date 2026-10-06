import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  orderId: string;
  expand?: string;
}

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

const getOrder: ActionDefinition<Input> = {
  key: "get-order",
  type: "read",
  idempotent: true,
  resource: "order",
  title: "Get Order",
  description: "Retrieve a single order by ID.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    { key: "expand", label: "Expand", type: "string", default: DEFAULT_EXPAND },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "created", type: "string", label: "Created" },
    { key: "changed", type: "string", label: "Changed" },
    { key: "name", type: "string", label: "Buyer name" },
    { key: "email", type: "string", label: "Buyer email" },
    { key: "status", type: "string", label: "Status" },
    { key: "costs", type: "object", label: "Costs" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "attendees", type: "array", label: "Attendees" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/orders/${encodeURIComponent(input.orderId)}/`, {
      query: { expand: input.expand ?? DEFAULT_EXPAND },
    });
  },
};

export default getOrder;
