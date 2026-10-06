import type { ActionDefinition } from "@w6w/types";
import { SallaClient } from "../lib/client.ts";

type Input = Record<PropertyKey, never>;

const orderStatusList: ActionDefinition<Input> = {
  key: "order-status-list",
  type: "search",
  resource: "order",
  title: "List Order Statuses",
  description:
    "List the store's order statuses, including custom sub-statuses. Needs the `orders.read` scope.",

  params: [],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "array",
      "label": "Order statuses",
    },
  ],

  execute(_input, ctx) {
    const client = new SallaClient(ctx);
    return client.get("/orders/statuses");
  },
};

export default orderStatusList;
