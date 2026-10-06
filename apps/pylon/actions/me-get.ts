import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";

/** `GET /me` — the organization and the user (or API token) behind the credential. */
const meGet: ActionDefinition<Record<string, never>> = {
  key: "me-get",
  type: "read",
  resource: "me",
  title: "Get Organization",
  description:
    "Return the organization and the user the API token belongs to. Handy for confirming a token and region.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Organization name" },
    { key: "user", type: "object", label: "Token user (id, email; API users have no email)" },
  ],

  execute(_input, ctx) {
    return new PylonClient(ctx).one("GET", "/me");
  },
};

export default meGet;
