import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  invitationId: string;
}

const FIELDS: readonly Field[] = [
  ["invitationId", "invitation_id", "s"],
];

const invitationWithdraw: ActionDefinition<Input, ActionResult> = {
  key: "invitation-withdraw",
  type: "perform",
  resource: "network",
  title: "Withdraw Invitation",
  description:
    "Withdraw a pending sent invitation. LinkedIn only lets you invite the same member again about three weeks later.",
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
      key: "invitationId",
      label: "Invitation ID",
      type: "string",
      required: true,
      hint: "The numeric invitation id from List Sent Invitations.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "network",
      "withdraw",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default invitationWithdraw;
