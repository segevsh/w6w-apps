import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";

/**
 * `GET /api/v3/member` — the caller's own Member profile ("whoami").
 *
 * This is also the auth `test` probe (`auth/api-token.ts`); both call the same
 * endpoint because it needs no workspace permission and returns nothing
 * sensitive.
 */
const memberGet: ActionDefinition<Record<string, never>> = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get Current Member",
  description: "Fetch the profile of the Member that owns the connected API token.",
  params: [],
  output: [{ key: "data", type: "object", label: "The current Member" }],

  execute(_input, ctx) {
    return new ShortcutClient(ctx).get("/member");
  },
};

export default memberGet;
