import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient } from "../lib/client.ts";

/**
 * `GET /me` — describe the token this connection uses: its name, scopes and expiry. Open on any
 * plan and needs no scope, so it works on a free workspace. The response is the token's
 * metadata, never its value.
 */
const meGet: ActionDefinition<Record<string, never>> = {
  key: "me-get",
  type: "read",
  resource: "token",
  title: "Get Token Info",
  description: "Describe the API token behind this connection: name, scopes, expiry, last use.",
  params: [],
  output: [
    { key: "name", type: "string", label: "Token name" },
    { key: "scopes", type: "array", label: "Granted scopes, e.g. forms:read" },
    { key: "expiresAt", type: "string", label: "Expiry, or null" },
    { key: "lastUsedAt", type: "string", label: "Last use, or null" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  execute(_input, ctx) {
    return new FormsparkClient(ctx).get("/me");
  },
};

export default meGet;
