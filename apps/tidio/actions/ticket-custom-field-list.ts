import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/** `GET /tickets/custom-fields` — a bare array of text / dropdown_text definitions. */
const ticketCustomFieldList: ActionDefinition<Record<string, never>> = {
  key: "ticket-custom-field-list",
  type: "read",
  resource: "ticket",
  title: "List Ticket Custom Fields",
  description:
    "List ticket custom field definitions (text and dropdown fields with allowed values).",
  params: [],
  output: [
    { key: "items", type: "array", label: "Fields [{id, name, type, is_required, values?}]" },
    { key: "count", type: "number", label: "Number of fields" },
  ],
  async execute(_input, ctx) {
    const body = await call(ctx, "GET", "/tickets/custom-fields");
    const items = Array.isArray(body) ? body : [];
    return { items, count: items.length };
  },
};

export default ticketCustomFieldList;
