import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  accountUid: string;
}

/** `DELETE /api/v1/crm/accounts/{accountUid}` — Delete an account record. Irreversible. */
const deleteAccount: ActionDefinition<Input> = {
  key: "delete-account",
  type: "perform",
  resource: "account",
  title: "Delete Account",
  description: "Delete an account record. Irreversible.",
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
      key: "deleted",
      type: "boolean",
      label: "Deleted",
    },
    {
      key: "uid",
      type: "string",
      label: "Uid of the deleted record",
    },
  ],

  async execute(input, ctx) {
    await OutsetaClient.fromConnection(ctx).request(`/crm/accounts/${pathId(input.accountUid)}`, {
      method: "DELETE",
    });
    return { deleted: true, uid: input.accountUid };
  },
};

export default deleteAccount;
