import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  accountUid: string;
}

/** `PUT /api/v1/crm/accounts/{accountUid}/remove-cancellation` — Withdraw a previous cancellation request so the account keeps subscribing. */
const removeAccountCancellation: ActionDefinition<Input> = {
  key: "remove-account-cancellation",
  type: "perform",
  resource: "account",
  title: "Remove Account Cancellation",
  description: "Withdraw a previous cancellation request so the account keeps subscribing.",
  idempotent: true,
  params: [
    {
      key: "accountUid",
      label: "Account Uid",
      type: "string",
      hint: "The account's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
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
      `/crm/accounts/${pathId(input.accountUid)}/remove-cancellation`,
      { method: "PUT" },
    );
  },
};

export default removeAccountCancellation;
