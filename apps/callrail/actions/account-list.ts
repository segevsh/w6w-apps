import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, type PageMeta } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/a.json` — every account this API key can see.
 *
 * The starting point for every other action in this app: CallRail API keys
 * are scoped to a user, not to one account, so a key can see more than one.
 * This is also this app's auth-liveness probe (`auth/api-token.ts`) — see
 * that file for why.
 */
interface Input {
  hipaaAccount?: boolean;
  sort?: "name";
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

interface Account {
  id: string;
  name: string;
  outbound_recording_enabled: boolean;
  hipaa_account: boolean;
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List every CallRail account this API key can access.",
  requiresAuth: true,
  params: [
    {
      key: "hipaaAccount",
      label: "HIPAA accounts only",
      type: "boolean",
      hint: "Filter to HIPAA accounts (or leave off for non-HIPAA accounts).",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [{ value: "name", label: "Name" }],
    },
    {
      key: "order",
      label: "Sort order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    ...paginationParams(),
  ],
  output: [
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching accounts" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<PageMeta & { accounts: Account[] }>(
      "/a.json",
      {
        query: {
          hipaa_account: input.hipaaAccount,
          sort: input.sort,
          order: input.order,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return {
      accounts: body.accounts,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default accountList;
