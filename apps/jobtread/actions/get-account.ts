import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  accountId: string;
}

interface AccountResponse {
  account: {
    id: string;
    name: string;
    type: "customer" | "vendor";
    isTaxable: boolean;
    createdAt: string;
    organization: { id: string; name: string };
  } | null;
}

const getAccount: ActionDefinition<Input> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Read a customer/vendor account by id (confirmed live 2026-09-15).",
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "isTaxable", type: "boolean", label: "Taxable" },
    { key: "createdAt", type: "string", label: "Created At" },
    { key: "organization", type: "object", label: "Organization" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<AccountResponse>({
      account: {
        $: { id: input.accountId },
        id: {},
        name: {},
        type: {},
        isTaxable: {},
        createdAt: {},
        organization: { id: {}, name: {} },
      },
    });
    if (!res.account) throw new Error(`account ${input.accountId} not found`);
    return res.account;
  },
};

export default getAccount;
