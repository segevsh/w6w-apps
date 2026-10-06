import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient, seg } from "../lib/client.ts";

interface Input {
  order_id: number;
  slug?: string;
  status_id?: number;
  note?: string;
  restore_items?: boolean;
  send_status_sms?: boolean;
}

const orderStatusUpdate: ActionDefinition<Input> = {
  key: "order-status-update",
  type: "perform",
  resource: "order",
  title: "Update Order Status",
  description:
    "Move an order to a predefined status (`slug`) or a custom sub-status (`status_id`). Needs the `orders.read_write` scope.",
  idempotent: true,
  params: [
    {
      "key": "order_id",
      "label": "Order ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "slug",
      "label": "Status slug",
      "type": "string",
      "hint": "A predefined Salla status, e.g. restoring.",
    },
    {
      "key": "status_id",
      "label": "Custom status ID",
      "type": "number",
      "hint": "A custom sub-status ID.",
    },
    {
      "key": "note",
      "label": "Note",
      "type": "string",
    },
    {
      "key": "restore_items",
      "label": "Restore items to stock",
      "type": "boolean",
    },
    {
      "key": "send_status_sms",
      "label": "Send status SMS",
      "type": "boolean",
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
      `/orders/${seg(input.order_id)}/status`,
      buildBody({
        slug: input.slug,
        status_id: input.status_id,
        note: input.note,
        restore_items: input.restore_items,
        send_status_sms: input.send_status_sms,
      }, undefined),
    );
  },
};

export default orderStatusUpdate;
