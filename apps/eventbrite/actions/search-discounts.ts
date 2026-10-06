import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  scope: string;
  codeFilter?: string;
  code?: string;
  type?: string;
  eventId?: string;
  ticketGroupId?: string;
  orderBy?: string;
  holdIds?: string;
  pageSize?: number;
  continuation?: string;
}

const action: ActionDefinition<Input> = {
  key: "search-discounts",
  type: "search",
  resource: "discount",
  title: "Search Discounts",
  description:
    "List Discounts of an Organization by scope, with optional code, type, event and ordering filters.",
  params: [
    {
      "key": "organizationId",
      "label": "Organization ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "scope",
      "label": "Scope",
      "type": "select",
      "required": true,
      "default": "event",
      "options": [
        {
          "value": "event",
          "label": "event",
        },
        {
          "value": "multi_events",
          "label": "multi_events",
        },
        {
          "value": "user",
          "label": "user",
        },
      ],
      "hint": "`event` requires an event ID.",
    },
    {
      "key": "codeFilter",
      "label": "Code filter",
      "type": "string",
      "hint": "Approximate match on code or name. Not with exact code.",
    },
    {
      "key": "code",
      "label": "Code",
      "type": "string",
      "hint": "Exact match on code or name.",
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
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "hint": "Required for the `event` scope.",
    },
    {
      "key": "ticketGroupId",
      "label": "Ticket group ID",
      "type": "string",
    },
    {
      "key": "orderBy",
      "label": "Order by",
      "type": "select",
      "options": [
        {
          "value": "code_asc",
          "label": "code_asc",
        },
        {
          "value": "code_desc",
          "label": "code_desc",
        },
        {
          "value": "discount_type_asc",
          "label": "discount_type_asc",
        },
        {
          "value": "discount_type_desc",
          "label": "discount_type_desc",
        },
        {
          "value": "start_asc",
          "label": "start_asc",
        },
        {
          "value": "start_desc",
          "label": "start_desc",
        },
      ],
      "hint": "Sorting needs exactly one of code or code filter.",
    },
    {
      "key": "holdIds",
      "label": "Hold IDs",
      "type": "string",
      "hint": "Comma-separated hold IDs (H123 or I123).",
    },
    {
      "key": "pageSize",
      "label": "Page size",
      "type": "number",
    },
    {
      "key": "continuation",
      "label": "Continuation token",
      "type": "string",
    },
  ],
  output: [
    {
      "key": "discounts",
      "type": "array",
      "label": "Discounts",
    },
    {
      "key": "pagination",
      "type": "object",
      "label": "Pagination",
    },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/organizations/${encodeURIComponent(input.organizationId)}/discounts/`, {
      query: {
        scope: input.scope,
        code_filter: input.codeFilter,
        code: input.code,
        type: input.type,
        event_id: input.eventId,
        ticket_group_id: input.ticketGroupId,
        order_by: input.orderBy,
        hold_ids: input.holdIds,
        page_size: input.pageSize,
        continuation: input.continuation,
      },
    });
  },
};

export default action;
