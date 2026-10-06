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

const profileReactionsList: ActionDefinition<Input, ActionResult> = {
  key: "profile-reactions-list",
  type: "read",
  resource: "profiles",
  title: "Get Profile Reactions",
  description: "List the reactions a member left on posts.",
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
      hint: "Number of reactions to return (default 10).",
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
      "get_reactions",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default profileReactionsList;
