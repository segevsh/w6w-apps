import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";

/**
 * `GET /v1/Account/{auth_id}/Call/?status=live` — returns `{ api_id, calls: [uuid…] }`,
 * a bare list of the UUIDs of ongoing calls (not CDR objects).
 */
const listLiveCalls: ActionDefinition<Record<string, never>> = {
  key: "list-live-calls",
  type: "read",
  resource: "call",
  title: "List Live Calls",
  description: "List the UUIDs of all ongoing calls on the account.",
  params: [],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    { key: "calls", type: "array", label: "UUIDs of ongoing calls" },
  ],

  execute(_input, ctx) {
    return new PlivoClient(ctx).request("Call/", { query: { status: "live" } });
  },
};

export default listLiveCalls;
