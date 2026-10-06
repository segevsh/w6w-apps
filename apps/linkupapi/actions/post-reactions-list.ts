import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  postUrl: string;
  count?: number;
  offset?: number;
}

const FIELDS: readonly Field[] = [
  ["postUrl", "post_url", "s"],
  ["count", "count", "n"],
  ["offset", "offset", "n"],
];

const postReactionsList: ActionDefinition<Input, ActionResult> = {
  key: "post-reactions-list",
  type: "read",
  resource: "content",
  title: "Get Post Reactions",
  description: "List the reactions on a post (up to 1000 per call).",
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
      key: "postUrl",
      label: "Post URL",
      type: "string",
      required: true,
      hint: "URL of the LinkedIn post.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of reactions to return (default 10).",
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
      "content",
      "get_reactions",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default postReactionsList;
