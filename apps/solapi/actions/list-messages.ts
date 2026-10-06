import type { ActionDefinition } from "@w6w/types";
import { SolapiClient } from "../lib/client.ts";

/**
 * List Messages — List sent and received messages with their delivery status, filtered by recipient, sender, group, type, status code or date range. History is kept 12 months. Cursor-paged.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId?: string;
  messageId?: string;
  to?: string;
  from?: string;
  type?: string;
  statusCode?: string;
  startDate?: string;
  endDate?: string;
  dateType?: string;
  criteria?: string;
  cond?: string;
  value?: string;
  limit?: number;
  startKey?: string;
}

const listMessages: ActionDefinition<Input> = {
  key: "list-messages",
  type: "read",
  resource: "message",
  title: "List Messages",
  description:
    "List sent and received messages with their delivery status, filtered by recipient, sender, group, type, status code or date range. History is kept 12 months. Cursor-paged.",
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
    },
    {
      "key": "messageId",
      "label": "Message ID",
      "type": "string",
    },
    {
      "key": "to",
      "label": "To",
      "type": "string",
      "hint": "Recipient number.",
    },
    {
      "key": "from",
      "label": "From",
      "type": "string",
      "hint": "Sender number.",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "string",
      "hint": "SMS, LMS, MMS, ATA, CTA, CTI, RCS_SMS, RCS_LMS, RCS_MMS, RCS_TPL, FAX or VOICE.",
    },
    {
      "key": "statusCode",
      "label": "Status code",
      "type": "string",
      "hint": "4-digit status code; 2000 is accepted, 4000 delivered.",
    },
    {
      "key": "startDate",
      "label": "Start date",
      "type": "string",
      "hint": "ISO 8601; only messages after it.",
    },
    {
      "key": "endDate",
      "label": "End date",
      "type": "string",
      "hint": "ISO 8601; only messages before it.",
    },
    {
      "key": "dateType",
      "label": "Date field",
      "type": "select",
      "hint": "Which timestamp the date range filters. Default CREATED.",
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
      "hint":
        "Advanced search: comma-separated field names, paired with Cond and Value (all three need the same number of entries).",
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
      "hint": "Comma-separated values.",
    },
    {
      "key": "limit",
      "label": "Page size",
      "type": "number",
      "hint": "1 to 500, default 20.",
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
      "label": "Messages on this page",
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
    return new SolapiClient(ctx).page("/messages/v4/list", "messageList", {
      query: {
        groupId: input.groupId,
        messageId: input.messageId,
        to: input.to,
        from: input.from,
        type: input.type,
        statusCode: input.statusCode,
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

export default listMessages;
