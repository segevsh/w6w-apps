import type { ActionDefinition } from "@w6w/types";
import { WorkOSClient } from "../lib/client.ts";

/**
 * `GET /connections/{id}` — one SSO connection in full.
 *
 * Beyond `state`, the useful field is `domains`: SSO routing is by email
 * domain, so a connection that is `active` but carries no domain the user's
 * address matches will never be reached. "It says active and it still doesn't
 * work" is almost always that.
 */
const action: ActionDefinition = {
  key: "connection-get",
  type: "read",
  resource: "connection",
  title: "Get an SSO connection",
  description:
    "One connection with its state and the email domains it routes. An active connection whose " +
    "domains do not match the user's address is never reached.",
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Connection ID" },
    { key: "state", type: "string", label: "State" },
    { key: "connection_type", type: "string", label: "Identity provider type" },
    { key: "domains", type: "array", label: "Email domains routed to this provider" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.connectionId ?? "").trim();
    if (!id) throw new Error("`connectionId` is required");
    return await new WorkOSClient(ctx).request(`/connections/${encodeURIComponent(id)}`);
  },
};

export default action;
