import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  profileUrl?: string;
  identifier?: string;
}

const FIELDS: readonly Field[] = [
  ["profileUrl", "profile_url", "s"],
  ["identifier", "identifier", "s"],
];

const profileVisit: ActionDefinition<Input, ActionResult> = {
  key: "profile-visit",
  type: "perform",
  resource: "profiles",
  title: "Visit Profile",
  description: "Visit a profile so the member sees a profile-view notification.",
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
      key: "profileUrl",
      label: "Profile URL",
      type: "string",
      hint: "Required unless identifier is given.",
    },
    {
      key: "identifier",
      label: "Public identifier",
      type: "string",
      hint: "The vanity name, as an alternative to the URL.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "profiles",
      "visit",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default profileVisit;
