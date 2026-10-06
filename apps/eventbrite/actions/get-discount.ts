import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  discountId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-discount",
  type: "read",
  resource: "discount",
  title: "Get Discount",
  description: "Retrieve a Discount by ID.",
  params: [
    {
      "key": "discountId",
      "label": "Discount ID",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Discount ID",
    },
    {
      "key": "type",
      "type": "string",
      "label": "Type",
    },
    {
      "key": "code",
      "type": "string",
      "label": "Code",
    },
    {
      "key": "amount_off",
      "type": "string",
      "label": "Amount off",
    },
    {
      "key": "percent_off",
      "type": "string",
      "label": "Percent off",
    },
    {
      "key": "event_id",
      "type": "string",
      "label": "Event ID",
    },
    {
      "key": "ticket_class_ids",
      "type": "array",
      "label": "Ticket class IDs",
    },
    {
      "key": "quantity_available",
      "type": "number",
      "label": "Quantity available",
    },
    {
      "key": "quantity_sold",
      "type": "number",
      "label": "Quantity sold",
    },
    {
      "key": "start_date",
      "type": "string",
      "label": "Start date",
    },
    {
      "key": "start_date_relative",
      "type": "number",
      "label": "Start date relative",
    },
    {
      "key": "end_date",
      "type": "string",
      "label": "End date",
    },
    {
      "key": "end_date_relative",
      "type": "number",
      "label": "End date relative",
    },
    {
      "key": "ticket_group_id",
      "type": "string",
      "label": "Ticket group ID",
    },
    {
      "key": "hold_ids",
      "type": "array",
      "label": "Hold IDs",
    },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/discounts/${encodeURIComponent(input.discountId)}/`);
  },
};

export default action;
