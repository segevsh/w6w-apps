import type { ActionDefinition } from "@w6w/types";
import { ORDER_DETAIL_OUTPUT, ORDER_DETAIL_SAMPLE } from "../lib/outputs.ts";
import { EventbriteClient } from "../lib/client.ts";
import { ORDER_EXPANSIONS } from "../lib/expansions.ts";

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
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: ORDER_EXPANSIONS,
      config: { valueFormat: "csv" },
      default: DEFAULT_EXPAND,
    },
  ],
  output: ORDER_DETAIL_OUTPUT,
  sample: ORDER_DETAIL_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/orders/${encodeURIComponent(input.orderId)}/`, {
      query: { expand: input.expand ?? DEFAULT_EXPAND },
    });
  },
};

export default getOrder;
