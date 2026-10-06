import type { ActionDefinition } from "@w6w/types";
import { SolapiClient } from "../lib/client.ts";

/**
 * List Message Groups — List message groups (every send creates one), filtered by date range or advanced criteria. Cursor-paged.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  startDate?: string;
  endDate?: string;
  dateType?: string;
  criteria?: string;
  cond?: string;
  value?: string;
  limit?: number;
  startKey?: string;
}

const listGroups: ActionDefinition<Input> = {
  key: "list-groups",
  type: "read",
  resource: "group",
  title: "List Message Groups",
  description:
    "List message groups (every send creates one), filtered by date range or advanced criteria. Cursor-paged.",
  params: [
    {
      "key": "startDate",
      "label": "Start date",
      "type": "string",
      "hint": "ISO 8601.",
    },
    {
      "key": "endDate",
      "label": "End date",
      "type": "string",
      "hint": "ISO 8601.",
    },
    {
      "key": "dateType",
      "label": "Date field",
      "type": "select",
      "hint": "Default CREATED.",
      "options": [
        {
          "value": "CREATED",
          "label": "CREATED",
        },
        {
          "value": "UPDATED",
          "label": "UPDATED",
        },
      ],
    },
    {
      "key": "criteria",
      "label": "Criteria",
      "type": "string",
      "hint": "Comma-separated field names, e.g. status,count.total (pair with Cond and Value).",
    },
    {
      "key": "cond",
      "label": "Cond",
      "type": "string",
      "hint": "Comma-separated operators: eq, ne, gt, gte, lt, lte.",
    },
    {
      "key": "value",
      "label": "Value",
      "type": "string",
      "hint": "Comma-separated values, e.g. COMPLETE,100.",
    },
    {
      "key": "limit",
      "label": "Page size",
      "type": "number",
      "hint": "Up to 500.",
    },
    {
      "key": "startKey",
      "label": "Start key",
      "type": "string",
      "hint": "`nextKey` from the previous page, to fetch the next one.",
    },
  ],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Groups on this page",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Rows on this page",
    },
    {
      "key": "nextKey",
      "type": "string",
      "label": "Cursor for the next page, null on the last page",
    },
    {
      "key": "limit",
      "type": "number",
      "label": "Page size applied",
    },
  ],

  execute(input, ctx) {
    return new SolapiClient(ctx).page("/messages/v4/groups", "groupList", {
      query: {
        startDate: input.startDate,
        endDate: input.endDate,
        dateType: input.dateType,
        criteria: input.criteria,
        cond: input.cond,
        value: input.value,
        limit: input.limit,
        startKey: input.startKey,
      },
    });
  },
};

export default listGroups;
