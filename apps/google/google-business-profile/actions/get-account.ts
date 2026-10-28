import type { ActionDefinition } from "@w6w/types";
import { ACCOUNT_MANAGEMENT_URL, accountName, GoogleBusinessProfileClient } from "../lib/client.ts";

interface Input {
  accountId: string;
}

/**
 * `accounts.get` — https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/get
 */
const getAccount: ActionDefinition<Input> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Retrieve a single Business Profile account by ID.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "The bare ID (e.g. 1234567890) or full resource name (accounts/1234567890).",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "accountName", type: "string", label: "Account name" },
    { key: "type", type: "string", label: "Account type" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(ACCOUNT_MANAGEMENT_URL, `/${accountName(input.accountId)}`);
  },
};

export default getAccount;
