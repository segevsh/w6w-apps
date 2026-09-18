import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  name: string;
  type: "customer" | "vendor";
}

interface CreateAccountResponse {
  createAccount: {
    createdAccount: { id: string; name: string; type: string; createdAt: string };
  };
}

const createAccount: ActionDefinition<Input> = {
  key: "create-account",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description:
    "Create a customer or vendor account. `organizationId`, `name`, and `type` are the three " +
    "fields JobTread's own docs state as required — confirmed live (2026-09-15): omitting any " +
    "one is rejected by Pave's own field-by-field validation before it reaches a permission check.",
  idempotent: false,
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Customer", value: "customer" },
        { label: "Vendor", value: "vendor" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "createdAt", type: "string", label: "Created At" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<CreateAccountResponse>({
      createAccount: {
        $: { organizationId: input.organizationId, name: input.name, type: input.type },
        createdAccount: { id: {}, name: {}, type: {}, createdAt: {} },
      },
    });
    return res.createAccount.createdAccount;
  },
};

export default createAccount;
