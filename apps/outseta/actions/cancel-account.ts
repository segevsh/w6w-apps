import type { ActionDefinition } from "@w6w/types";
import { buildBody, OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  accountUid: string;
  reason?: string;
  comment?: string;
}

/** `PUT /api/v1/crm/accounts/{accountUid}/cancel` — Record a cancellation request. The account must be Subscribing; it moves to Canceling and ends at renewal. */
const cancelAccount: ActionDefinition<Input> = {
  key: "cancel-account",
  type: "perform",
  resource: "account",
  title: "Cancel Account",
  description:
    "Record a cancellation request. The account must be Subscribing; it moves to Canceling and ends at renewal.",
  idempotent: true,
  params: [
    {
      key: "accountUid",
      label: "Account Uid",
      type: "string",
      hint: "The account's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "reason",
      label: "Reason",
      type: "string",
    },
    {
      key: "comment",
      label: "Comment",
      type: "text",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(
      `/crm/accounts/${pathId(input.accountUid)}/cancel`,
      {
        method: "PUT",
        body: buildBody({ CancelationReason: input.reason, Comment: input.comment }, undefined),
      },
    );
  },
};

export default cancelAccount;
