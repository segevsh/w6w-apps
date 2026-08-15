import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam, fieldsParam } from "../lib/params.ts";

/** `GET /v3/a/{account_id}.json` — a single account's own record. */
interface Input {
  accountId: string;
  fields?: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch a single CallRail account, scoped to the provided API key.",
  params: [accountIdParam, { ...fieldsParam, hint: "e.g. numeric_id — the account's numeric id." }],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Account name" },
    { key: "outbound_recording_enabled", type: "boolean", label: "Outbound recording enabled" },
    { key: "hipaa_account", type: "boolean", label: "HIPAA account" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(`/a/${encodeId(input.accountId)}.json`, {
      query: { fields: input.fields },
    });
  },
};

export default accountGet;
