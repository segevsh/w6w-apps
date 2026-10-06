import type { ActionDefinition } from "@w6w/types";
import { call, V2 } from "../lib/client.ts";
import { select } from "../lib/params.ts";

type Input = {
  status?: string;
};

const linkedinAccountList: ActionDefinition<Input> = {
  key: "linkedin-account-list",
  type: "read",
  resource: "linkedin_account",
  title: "List LinkedIn Accounts",
  description: "List connected LinkedIn accounts, optionally by session status.",
  params: [
    select("status", "Session status", ["CONNECTED", "DISCONNECTED", "WAITING_FOR_CONNECTION"]),
  ],
  output: [
    {
      key: "accounts",
      type: "array",
      label: "Accounts: id, session_status, full_name, linkedin_url, level",
    },
    { key: "count", type: "number", label: "Accounts returned" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V2, "/linkedin_accounts", {
      query: { status: input.status },
    }) as { linkedin_accounts?: unknown[] };
    const accounts = body.linkedin_accounts ?? [];
    return { accounts, count: accounts.length };
  },
};

export default linkedinAccountList;
