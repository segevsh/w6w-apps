import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  profileUrl: string;
  count?: number;
  cursor?: string;
}

const FIELDS: readonly Field[] = [
  ["profileUrl", "profile_url", "s"],
  ["count", "count", "n"],
  ["cursor", "cursor", "s"],
];

const profileCommentsList: ActionDefinition<Input, ActionResult> = {
  key: "profile-comments-list",
  type: "read",
  resource: "profiles",
  title: "Get Profile Comments",
  description: "List the comments a member wrote on posts and articles.",
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
      key: "profileUrl",
      label: "Profile URL",
      type: "string",
      required: true,
      hint: "URL of the target profile (https://www.linkedin.com/in/...).",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of comments to return (default 10).",
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
      "profiles",
      "get_comments",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default profileCommentsList;
