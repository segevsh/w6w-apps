import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  entityUrn: string;
  sharedSecret: string;
}

const FIELDS: readonly Field[] = [
  ["entityUrn", "entity_urn", "s"],
  ["sharedSecret", "shared_secret", "s"],
];

const invitationDecline: ActionDefinition<Input, ActionResult> = {
  key: "invitation-decline",
  type: "perform",
  resource: "network",
  title: "Decline Invitation",
  description: "Decline a pending received connection invitation.",
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
      key: "entityUrn",
      label: "Invitation URN",
      type: "string",
      required: true,
      hint: "entity_urn from List Invitations.",
    },
    {
      key: "sharedSecret",
      label: "Shared secret",
      type: "string",
      required: true,
      hint: "shared_secret from List Invitations.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "network",
      "decline",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default invitationDecline;
