import type { ActionDefinition } from "@w6w/types";
import { ZohoMailClient } from "../lib/client.ts";

/**
 * `GET /api/accounts` — "Get All Accounts of a User". Every mailbox account
 * the authenticated user can see, each with its own `accountId` — the id
 * every other action in this app scopes its path to.
 *
 * Most connections have exactly one account and never need this: `afterConnect`
 * already records the first one as the connection's default (see
 * `lib/client.ts#accountIdFrom`). This action exists for the case a
 * connection genuinely has more than one — an admin, or a user with a
 * delegated mailbox — and needs to pick a specific `accountId` to pass to
 * another action.
 */
interface AccountListOutputItem {
  accountId: string;
  primaryEmailAddress: string;
  displayName: string;
  accountName: string;
  mailboxStatus: string;
  enabled: boolean;
  role: string;
}

const accountList: ActionDefinition<Record<string, never>, AccountListOutputItem[]> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "Get Accounts",
  description: "List every mailbox account the authenticated user can see.",
  params: [],
  output: [
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "primaryEmailAddress", type: "string", label: "Primary email address" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "accountName", type: "string", label: "Account (organisation) name" },
    { key: "mailboxStatus", type: "string", label: "Mailbox status" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "role", type: "string", label: "Role" },
  ],

  async execute(_input, ctx) {
    const accounts = await new ZohoMailClient(ctx).request<AccountListOutputItem[]>("/accounts");
    return accounts ?? [];
  },
};

export default accountList;
