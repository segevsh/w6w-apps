import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
  action?: string;
  accountId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

const FIELDS: readonly Field[] = [
  ["limit", "limit", "n"],
  ["offset", "offset", "n"],
  ["action", "action", "s"],
  ["accountId", "account_id", "s"],
  ["status", "status", "s"],
  ["dateFrom", "date_from", "s"],
  ["dateTo", "date_to", "s"],
];

const logList: ActionDefinition<Input, ActionResult> = {
  key: "log-list",
  type: "read",
  resource: "account",
  title: "List API Logs",
  description:
    "Browse the API call history, one entry per request, with the credits each consumed.",
  params: [
    { key: "limit", label: "Limit", type: "number", hint: "Rows per page, 1-200 (default 50)." },
    { key: "offset", label: "Offset", type: "number", hint: "Rows to skip." },
    {
      key: "action",
      label: "Action",
      type: "string",
      hint: "Only calls of this action, e.g. invite, send, search_people.",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "Only calls made with this account.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ "value": "success", "label": "success" }, { "value": "error", "label": "error" }],
    },
    { key: "dateFrom", label: "From", type: "string", hint: "ISO date (YYYY-MM-DD) or datetime." },
    {
      key: "dateTo",
      label: "To",
      type: "string",
      hint: "ISO date or datetime; a date-only value includes the whole day.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request("GET", "/v2/logs", {
      query: mapInput(input, FIELDS),
    });
  },
};

export default logList;
