import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  count?: number;
  cursor?: string;
}

const FIELDS: readonly Field[] = [
  ["count", "count", "n"],
  ["cursor", "cursor", "s"],
];

const feedGet: ActionDefinition<Input, ActionResult> = {
  key: "feed-get",
  type: "read",
  resource: "content",
  title: "Get Feed",
  description: "Read the home feed of the connected account.",
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
      hint: "Number of feed posts to return (default 10).",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The cursor from the previous response's next_cursor; omit for the first page.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "content",
      "get_feed",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default feedGet;
