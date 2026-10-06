import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

type Obj = Record<string, unknown>;

/** Accepts an object or a JSON string; anything else yields undefined. */
function toObj(v: unknown): Obj | undefined {
  if (typeof v === "string" && v.trim()) {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error("Expected valid JSON");
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? v as Obj : undefined;
}

function compact(o: Obj): Obj {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

interface Input {
  discountId: string;
  type?: string;
  code?: string;
  amountOff?: string;
  percentOff?: string;
  eventId?: string;
  ticketClassIds?: string[];
  quantityAvailable?: number;
  startDate?: string;
  startDateRelative?: number;
  endDate?: string;
  endDateRelative?: number;
  ticketGroupId?: string;
  holdIds?: string[];
  extra?: unknown;
}

const action: ActionDefinition<Input> = {
  key: "update-discount",
  type: "perform",
  idempotent: true,
  resource: "discount",
  title: "Update Discount",
  description:
    "Update a Discount by ID on Eventbrite. Supplied fields are sent as the discount object.",
  params: [
    {
      "key": "discountId",
      "label": "Discount ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "options": [
        {
          "value": "coded",
          "label": "Coded discount",
        },
        {
          "value": "access",
          "label": "Access code",
        },
        {
          "value": "public",
          "label": "Public discount",
        },
        {
          "value": "hold",
          "label": "Hold discount",
        },
      ],
    },
    {
      "key": "code",
      "label": "Code",
      "type": "string",
      "hint": "Name of a public discount, or the secret code for a coded discount / access code.",
    },
    {
      "key": "amountOff",
      "label": "Amount off",
      "type": "string",
      "hint":
        "Fixed amount in the event currency (0.01 to 99999.99). Cannot be combined with percent off.",
    },
    {
      "key": "percentOff",
      "label": "Percent off",
      "type": "string",
      "hint": "1.00 to 100.00. Cannot be combined with amount off.",
    },
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "hint":
        "Single-event discounts only; leave empty for organization-wide or ticket-group discounts.",
    },
    {
      "key": "ticketClassIds",
      "label": "Ticket class IDs",
      "type": "array",
      "item": {
        "type": "string",
      },
      "hint": "Limit the discount to these ticket classes.",
    },
    {
      "key": "quantityAvailable",
      "label": "Quantity available",
      "type": "number",
      "hint": "Times the discount can be used; 0 is unlimited.",
    },
    {
      "key": "startDate",
      "label": "Start date",
      "type": "string",
      "hint":
        "Naive local ISO 8601 in the event timezone, e.g. 2026-10-01T09:00:00. Not with start date relative.",
    },
    {
      "key": "startDateRelative",
      "label": "Start date relative (seconds)",
      "type": "number",
      "hint": "Seconds before event start; >59 and a multiple of 60.",
    },
    {
      "key": "endDate",
      "label": "End date",
      "type": "string",
      "hint": "Naive local ISO 8601 in the event timezone. Not with end date relative.",
    },
    {
      "key": "endDateRelative",
      "label": "End date relative (seconds)",
      "type": "number",
      "hint": "Seconds before event start; >59 and a multiple of 60.",
    },
    {
      "key": "ticketGroupId",
      "label": "Ticket group ID",
      "type": "string",
    },
    {
      "key": "holdIds",
      "label": "Hold IDs",
      "type": "array",
      "item": {
        "type": "string",
      },
      "hint": "Hold IDs this discount unlocks, e.g. H123 or I123.",
    },
    {
      "key": "extra",
      "label": "Additional fields",
      "type": "json",
      "advanced": true,
      "hint": "JSON object deep-merged into the request object for any field not listed above.",
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

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const discount = deepMerge(
      compact({
        type: input.type,
        code: input.code,
        amount_off: input.amountOff,
        percent_off: input.percentOff,
        event_id: input.eventId,
        ticket_class_ids: input.ticketClassIds?.length ? input.ticketClassIds : undefined,
        quantity_available: input.quantityAvailable,
        start_date: input.startDate,
        start_date_relative: input.startDateRelative,
        end_date: input.endDate,
        end_date_relative: input.endDateRelative,
        ticket_group_id: input.ticketGroupId,
        hold_ids: input.holdIds?.length ? input.holdIds : undefined,
      }),
      toObj(input.extra),
    );
    return client.request(`/discounts/${encodeURIComponent(input.discountId)}/`, {
      method: "POST",
      body: { discount },
    });
  },
};

export default action;
