import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, RingCentralClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}` — basic information about the
 * RingCentral customer account (company), not the connected user.
 *
 * Needs the `ReadAccounts` app permission and the `ReadCompanyInfo` user
 * permission. Unlike Apify's equivalent whoami, `GetAccountInfoResponse`
 * carries no credential material — no field here needs stripping.
 */
interface Input {
  accountId?: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch basic information about the RingCentral account (company).",
  params: [accountIdParam],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "mainNumber", type: "string", label: "Main company phone number" },
    { key: "status", type: "string", label: "Account status" },
    { key: "federated", type: "boolean", label: "Belongs to an account federation" },
    { key: "serviceInfo", type: "object", label: "Service plan / brand info" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}`,
    );
  },
};

export default accountGet;
