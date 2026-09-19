import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  name?: string;
  isTaxable?: boolean;
}

interface UpdateAccountResponse {
  updateAccount: { account: { id: string; name: string; type: string; isTaxable: boolean } };
}

const updateAccount: ActionDefinition<Input> = {
  key: "update-account",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description:
    "Update a customer/vendor account's editable fields. Shape confirmed live (2026-09-15): " +
    'the `updateAccount.$` mutation args and the returned `account` field each need their own ' +
    "`id` — this action supplies both from the one `accountId` input.",
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "isTaxable", label: "Taxable", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "isTaxable", type: "boolean", label: "Taxable" },
  ],

  async execute(input, ctx) {
    const args: Record<string, unknown> = { id: input.accountId };
    if (input.name !== undefined) args.name = input.name;
    if (input.isTaxable !== undefined) args.isTaxable = input.isTaxable;

    const client = new JobTreadClient(ctx);
    const res = await client.query<UpdateAccountResponse>({
      updateAccount: {
        $: args,
        account: {
          $: { id: input.accountId },
          id: {},
          name: {},
          type: {},
          isTaxable: {},
        },
      },
    });
    return res.updateAccount.account;
  },
};

export default updateAccount;
