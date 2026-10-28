import type { ActionDefinition } from "@w6w/types";
import { ACCOUNT_MANAGEMENT_URL, GoogleBusinessProfileClient } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
  parentAccount?: string;
}

/**
 * `accounts.list` — https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list
 *
 * The personal account of the connected user is always the first item
 * (unless filtered out) — useful as a starting point for discovering the
 * account/location ids the other actions need.
 */
const listAccounts: ActionDefinition<Input> = {
  key: "list-accounts",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description:
    "List the Business Profile accounts accessible to the connected user. Returns one page; pass pageToken for the next.",
  params: [
    { key: "pageSize", label: "Page size", type: "number", default: 20 },
    { key: "pageToken", label: "Page token", type: "string" },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "The only supported filter is on `type`, e.g. `type=USER_GROUP`.",
    },
    {
      key: "parentAccount",
      label: "Parent account",
      type: "string",
      hint:
        "Resource name of an Organization or User Group account whose directly accessible accounts to list, e.g. accounts/1234. Leave empty to list accounts for the connected user.",
    },
  ],
  output: [
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(ACCOUNT_MANAGEMENT_URL, "/accounts", {
      query: {
        pageSize: input.pageSize ?? 20,
        pageToken: input.pageToken,
        filter: input.filter,
        parentAccount: input.parentAccount,
      },
    });
  },
};

export default listAccounts;
