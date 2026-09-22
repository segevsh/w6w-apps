import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";

/**
 * `GET /api/tenant` — "Get general information".
 *
 * The account's own email address, and nothing else: `TenantInfo` is a single
 * optional `email` property. It is the cheapest read in the API and the one
 * endpoint that requires no resource scope, which is why it is also the
 * credential probe (`auth/api-key.ts`) — but it is worth exposing as an Action
 * too, because "which account is this connection pointed at?" is the first
 * question a workflow author asks, and this is the only endpoint that answers
 * it.
 *
 * No parameter of any kind, and no credential material in the response: see
 * `auth/api-key.ts` for the live 200 body.
 */
const tenantInfoGet: ActionDefinition<Record<string, never>> = {
  key: "tenant-info-get",
  type: "read",
  resource: "tenant",
  title: "Get Account Info",
  description: "Read the account's email address — the one endpoint that identifies the tenant.",
  params: [],
  output: [
    { key: "email", type: "string", label: "Account email" },
  ],

  execute(_input, ctx) {
    return new SimpleTextingClient(ctx).json("/api/tenant");
  },
};

export default tenantInfoGet;
