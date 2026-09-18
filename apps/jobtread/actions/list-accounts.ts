import type { ActionDefinition } from "@w6w/types";
import { connectionArgs, JobTreadClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  size?: number;
  page?: string;
  where?: unknown;
  sortBy?: unknown;
}

interface AccountNode {
  id: string;
  name: string;
  type: "customer" | "vendor";
  isTaxable: boolean;
  createdAt: string;
}

interface OrganizationAccountsResponse {
  organization: {
    accounts: { nodes: AccountNode[]; nextPage: string | null };
  } | null;
}

const listAccounts: ActionDefinition<Input> = {
  key: "list-accounts",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description:
    "List an organization's customer/vendor accounts (organization.accounts). Fields and the " +
    "where/sortBy/pagination grammar confirmed live (2026-09-15) against Pave's own shape " +
    "validation errors.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "size", label: "Page Size", type: "number", default: 25 },
    { key: "page", label: "Page Cursor", type: "string", hint: "From a previous call's nextPage." },
    {
      key: "where",
      label: "Filter",
      type: "json",
      hint: 'Pave filter, e.g. `["type", "=", "customer"]`, or `{"and": [["type","=","customer"], ' +
        '["name","=","Acme"]]}`. Omit to return every account.',
    },
    {
      key: "sortBy",
      label: "Sort",
      type: "json",
      hint: 'JSON array of `{"field": "name", "order": "asc"}`.',
    },
  ],
  output: [
    { key: "nodes", type: "array", label: "Accounts" },
    { key: "nextPage", type: "string", label: "Next Page Cursor" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<OrganizationAccountsResponse>({
      organization: {
        $: { id: input.organizationId },
        accounts: {
          $: connectionArgs(input),
          nextPage: {},
          nodes: { id: {}, name: {}, type: {}, isTaxable: {}, createdAt: {} },
        },
      },
    });
    if (!res.organization) throw new Error(`organization ${input.organizationId} not found`);
    return res.organization.accounts;
  },
};

export default listAccounts;
