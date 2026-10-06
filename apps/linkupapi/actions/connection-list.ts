import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  count?: number;
  offset?: number;
  useCache?: boolean;
}

const FIELDS: readonly Field[] = [
  ["count", "count", "n"],
  ["offset", "offset", "n"],
  ["useCache", "use_cache", "b"],
];

const connectionList: ActionDefinition<Input, ActionResult> = {
  key: "connection-list",
  type: "read",
  resource: "network",
  title: "List Connections",
  description: "List the account's connections, newest first.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of connections to return (default 10).",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint:
        "Zero-indexed offset; pass the previous response's pagination.next_offset for the next page.",
    },
    {
      key: "useCache",
      label: "Use cache",
      type: "boolean",
      hint: "Serve the list from LinkupAPI's stored copy: no credit, no LinkedIn traffic.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "network",
      "list_connections",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default connectionList;
