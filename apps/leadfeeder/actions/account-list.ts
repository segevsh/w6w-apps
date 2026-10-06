import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import { dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId?: string;
  includeCompany?: boolean;
}

/** `GET /v1/accounts` — verified against the vendor OpenAPI document (2026-10-06). */
const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description:
    "List the Leadfeeder accounts the key can access, or fetch one account with its credit balance when an account id is given.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint:
        "When set, returns that one account including `credits` (available / used / remaining / next reset); omitted, lists every accessible account.",
    },
    {
      key: "includeCompany",
      label: "Include account company",
      type: "boolean",
      hint: "Inline the account company (`include=account_company`).",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/accounts";
    const query = {
      account_id: input.accountId,
      include: input.includeCompany ? "account_company" : undefined,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default accountList;
