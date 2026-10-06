import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  profileUrl?: string;
  identifier?: string;
  message?: string;
}

const FIELDS: readonly Field[] = [
  ["profileUrl", "profile_url", "s"],
  ["identifier", "identifier", "s"],
  ["message", "message", "s"],
];

const connectionInvite: ActionDefinition<Input, ActionResult> = {
  key: "connection-invite",
  type: "perform",
  resource: "network",
  title: "Send Connection Request",
  description: "Send a connection request, optionally with a note.",
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
    {
      key: "message",
      label: "Note",
      type: "string",
      hint: "Optional note: up to 300 characters on a paid LinkedIn account, 200 on a free one.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "network",
      "invite",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default connectionInvite;
