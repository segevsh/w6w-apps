import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  count?: number;
  offset?: number;
}

const FIELDS: readonly Field[] = [
  ["count", "count", "n"],
  ["offset", "offset", "n"],
];

const profileViewersList: ActionDefinition<Input, ActionResult> = {
  key: "profile-viewers-list",
  type: "read",
  resource: "profiles",
  title: "Get Profile Viewers",
  description: "List the people who recently viewed the connected account's profile.",
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
      hint: "Number of viewers to return (default 10).",
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
    return await new LinkupApiClient(ctx).act(
      "profiles",
      "get_viewers",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default profileViewersList;
