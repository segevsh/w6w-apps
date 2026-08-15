import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `GET /ping` — the account and calling-user identity behind this
 * connection. Also the credential-liveness probe in `auth/api-token.ts`; see
 * that file for why the two share this endpoint.
 */
interface Input {
  mode?: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Read the account and user info behind the connected access token.",
  requiresAuth: true,
  params: [modeParam],
  output: [
    { key: "account_name", type: "string", label: "Account name" },
    { key: "account_id", type: "string", label: "Account ID" },
    { key: "account_version", type: "string", label: "Account plan" },
    { key: "account_url", type: "string", label: "Storefront URL" },
    { key: "user_id", type: "string", label: "User ID" },
    { key: "user_username", type: "string", label: "User email" },
    { key: "user_name", type: "string", label: "User name" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get("/ping", { mode: input.mode });
  },
};

export default accountGet;
