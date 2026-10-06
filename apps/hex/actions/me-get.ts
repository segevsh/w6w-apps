import type { ActionDefinition } from "@w6w/types";
import { HexClient } from "../lib/client.ts";

/**
 * `GET /v1/users/me` — who the token belongs to.
 *
 * A personal token returns `{ id, name, email, role, lastLoginDate, org }`; a
 * workspace token omits the user fields and returns only `{ org, token: { exp } }`.
 * The response carries the token's expiry, never the token.
 */
type Input = Record<string, never>;

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Fetch the user the token belongs to, the workspace id and the token's expiry. A workspace token returns no user fields.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID (personal tokens only)" },
    { key: "email", type: "string", label: "Email (personal tokens only)" },
    { key: "role", type: "string", label: "Workspace role (personal tokens only)" },
    { key: "org", type: "object", label: "Workspace: { id }" },
    { key: "token", type: "object", label: "Token metadata: { exp }" },
  ],

  execute(_input, ctx) {
    return new HexClient(ctx).json("/users/me");
  },
};

export default meGet;
