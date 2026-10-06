import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  count?: number;
  offset?: number;
}

const FIELDS: readonly Field[] = [
  ["count", "count", "n"],
  ["offset", "offset", "n"],
];

const accountList: ActionDefinition<Input, ActionResult> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description:
    "List the channel accounts (LinkedIn, WhatsApp, email) connected to the API key, with their status and the account_id every other action needs.",
  params: [
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Accounts per page, 1-500 (default 50).",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint:
        "Zero-indexed offset; pass the previous response's pagination.next_offset for the next page.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request("GET", "/v2/accounts", {
      query: mapInput(input, FIELDS),
    });
  },
};

export default accountList;
