import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  count?: number;
  offset?: number;
  invitationType?: string;
}

const FIELDS: readonly Field[] = [
  ["count", "count", "n"],
  ["offset", "offset", "n"],
  ["invitationType", "invitation_type", "s"],
];

const invitationList: ActionDefinition<Input, ActionResult> = {
  key: "invitation-list",
  type: "read",
  resource: "network",
  title: "List Invitations",
  description: "List pending received invitations.",
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
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of invitations to return (default 10).",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint:
        "Zero-indexed offset; pass the previous response's pagination.next_offset for the next page.",
    },
    {
      key: "invitationType",
      label: "Invitation type",
      type: "string",
      hint: "For example CONNECTION; omit for all types.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "network",
      "list_invitations",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default invitationList;
