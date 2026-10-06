import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  postUrl: string;
}

const FIELDS: readonly Field[] = [
  ["postUrl", "post_url", "s"],
];

const postRepost: ActionDefinition<Input, ActionResult> = {
  key: "post-repost",
  type: "perform",
  resource: "content",
  title: "Repost",
  description: "Repost a post to the account's feed.",
  idempotent: false,
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
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "content",
      "repost",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default postRepost;
