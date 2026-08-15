import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface AccountGetInput {
  accountId?: string;
}

interface AccountGetOutput {
  accountId: string;
  primaryEmailAddress: string;
  displayName: string;
  accountName: string;
  mailboxStatus: string;
  timeZone: string;
  language: string;
  usedStorage: number;
  allowedStorage: number;
}

/**
 * `GET /api/accounts/{accountId}` — "Get a Specific Account Details". The
 * same fields `account-list` returns for every account, for one.
 */
const accountGet: ActionDefinition<AccountGetInput, AccountGetOutput> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch the details of one mailbox account.",
  params: [accountIdParam],
  output: [
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "primaryEmailAddress", type: "string", label: "Primary email address" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "accountName", type: "string", label: "Account (organisation) name" },
    { key: "mailboxStatus", type: "string", label: "Mailbox status" },
    { key: "timeZone", type: "string", label: "Time zone" },
    { key: "language", type: "string", label: "Language" },
    { key: "usedStorage", type: "number", label: "Used storage (bytes)" },
    { key: "allowedStorage", type: "number", label: "Allowed storage (bytes)" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const account = await new ZohoMailClient(ctx).request<AccountGetOutput>(
      `/accounts/${encodeURIComponent(accountId)}`,
    );
    if (!account) throw new Error(`Zoho Mail returned no account for ${accountId}`);
    return account;
  },
};

export default accountGet;
