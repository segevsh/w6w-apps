import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  profileUrl: string;
  count?: number;
  cursor?: string;
  includeReshares?: boolean;
}

const FIELDS: readonly Field[] = [
  ["profileUrl", "profile_url", "s"],
  ["count", "count", "n"],
  ["cursor", "cursor", "s"],
  ["includeReshares", "include_reshares", "b"],
];

const profilePostsList: ActionDefinition<Input, ActionResult> = {
  key: "profile-posts-list",
  type: "read",
  resource: "profiles",
  title: "Get Profile Posts",
  description: "List the posts a member published, newest first.",
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
      hint: "Number of posts to return (default 10).",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The cursor from the previous response's next_cursor; omit for the first page.",
    },
    {
      key: "includeReshares",
      label: "Include reshares",
      type: "boolean",
      hint: "Also return the member's reshares and liked or commented posts.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "profiles",
      "get_posts",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default profilePostsList;
