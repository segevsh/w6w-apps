import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  extraFields?: string;
}

/**
 * `GET /v3/account/summary` — who this connection belongs to: organisation
 * name, owner name, contact email and phone, website, time zone, and the
 * `encoded_account_id`.
 *
 * This is the only action here that needs the `account_read` scope rather than
 * `contact_data` or `campaign_data`, which makes it the one action a
 * narrowly-scoped connection can legitimately fail on with a 403. That is also
 * why it is *not* the app's auth liveness probe — see `auth/oauth2.ts`.
 *
 * `physical_address` and `company_logo` are omitted unless `extra_fields` asks
 * for them.
 */
const getAccountSummary: ActionDefinition<Input> = {
  key: "get-account-summary",
  type: "read",
  resource: "account",
  title: "Get Account Summary",
  description:
    "Fetch the connected Constant Contact account's details. Needs the `account_read` scope.",
  params: [
    {
      key: "extraFields",
      label: "Extra fields",
      type: "string",
      hint: "Comma-separated: `physical_address`, `company_logo`. Both omitted by default.",
    },
  ],
  output: [
    { key: "organization_name", type: "string", label: "Organisation" },
    { key: "contact_email", type: "string", label: "Owner email" },
    { key: "encoded_account_id", type: "string", label: "Account ID" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    return client.request("/account/summary", {
      query: { extra_fields: input.extraFields },
    });
  },
};

export default getAccountSummary;
