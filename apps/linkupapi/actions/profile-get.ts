import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  profileUrl?: string;
  identifier?: string;
  profileUrn?: string;
  salesNav?: boolean;
}

const FIELDS: readonly Field[] = [
  ["profileUrl", "profile_url", "s"],
  ["identifier", "identifier", "s"],
  ["profileUrn", "profile_urn", "s"],
  ["salesNav", "sales_nav", "b"],
];

const profileGet: ActionDefinition<Input, ActionResult> = {
  key: "profile-get",
  type: "read",
  resource: "profiles",
  title: "Get Profile",
  description: "Read the profile of any LinkedIn member by URL, public identifier or URN.",
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
      hint:
        "Classic /in/... URL or a Sales Navigator lead URL. Required unless identifier or profileUrn is given.",
    },
    {
      key: "identifier",
      label: "Public identifier",
      type: "string",
      hint: "The vanity name, as an alternative to the URL.",
    },
    { key: "profileUrn", label: "Profile URN", type: "string", hint: "Alternative to the URL." },
    {
      key: "salesNav",
      label: "Sales Navigator",
      type: "boolean",
      hint: "Use the Sales Navigator seat of the account (it must hold one).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "profiles",
      "get",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default profileGet;
