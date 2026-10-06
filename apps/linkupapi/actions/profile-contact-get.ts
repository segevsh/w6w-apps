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

const profileContactGet: ActionDefinition<Input, ActionResult> = {
  key: "profile-contact-get",
  type: "read",
  resource: "profiles",
  title: "Get Contact Info",
  description:
    "Read the contact details a member shares with the connected account (email, phone, websites).",
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
      "profiles",
      "get_contact",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default profileContactGet;
