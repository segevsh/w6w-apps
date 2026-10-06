import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient, seg } from "../lib/client.ts";

interface Input {
  order_id: number;
  note: string;
}

const orderHistoryCreate: ActionDefinition<Input> = {
  key: "order-history-create",
  type: "perform",
  resource: "order",
  title: "Add Order Note",
  description: "Add a note to an order's history. Needs the `orders.read_write` scope.",
  idempotent: false,
  params: [
    {
      "key": "order_id",
      "label": "Order ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "note",
      "label": "Note",
      "type": "text",
      "required": true,
    },
  ],
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
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.post(
      `/orders/${seg(input.order_id)}/histories`,
      buildBody({
        note: input.note,
      }, undefined),
    );
  },
};

export default orderHistoryCreate;
