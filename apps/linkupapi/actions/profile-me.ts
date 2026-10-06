import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";

interface Input {
  accountId: string;
}

const profileMe: ActionDefinition<Input, ActionResult> = {
  key: "profile-me",
  type: "read",
  resource: "profiles",
  title: "Get My Profile",
  description: "Read the profile of the connected account itself.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act("profiles", "get_me", input.accountId, {});
  },
};

export default profileMe;
