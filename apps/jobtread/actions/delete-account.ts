import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  accountId: string;
}

const deleteAccount: ActionDefinition<Input> = {
  key: "delete-account",
  type: "perform",
  resource: "account",
  title: "Delete Account",
  description: "Delete a customer/vendor account by id (confirmed live 2026-09-15: `deleteAccount.$.id` is required).",
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    await client.query({ deleteAccount: { $: { id: input.accountId } } });
    return { deleted: true };
  },
};

export default deleteAccount;
