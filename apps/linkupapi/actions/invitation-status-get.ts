import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  profileUrl: string;
}

const FIELDS: readonly Field[] = [
  ["profileUrl", "profile_url", "s"],
];

const invitationStatusGet: ActionDefinition<Input, ActionResult> = {
  key: "invitation-status-get",
  type: "read",
  resource: "network",
  title: "Check Invitation Status",
  description:
    "Check the connection or invitation state between the connected account and a member.",
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
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "network",
      "check_invitation",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default invitationStatusGet;
