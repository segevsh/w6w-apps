import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  postUrl: string;
  commentText: string;
  companyUrl?: string;
}

const FIELDS: readonly Field[] = [
  ["postUrl", "post_url", "s"],
  ["commentText", "comment_text", "s"],
  ["companyUrl", "company_url", "s"],
];

const postComment: ActionDefinition<Input, ActionResult> = {
  key: "post-comment",
  type: "perform",
  resource: "content",
  title: "Comment on Post",
  description: "Add a comment to a post, optionally as a company page you administer.",
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
    { key: "commentText", label: "Comment", type: "text", required: true },
    {
      key: "companyUrl",
      label: "As company page",
      type: "string",
      hint: "Company page URL to comment as; you must administer it.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "content",
      "comment",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default postComment;
