import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";

/**
 * `GET /users/count` — the cheap way to get a total, since `user-list`'s own `GET /users` never
 * returns one (unlike, say, `organization-list`'s enveloped response).
 */
const action: ActionDefinition = {
  key: "user-count",
  type: "read",
  resource: "user",
  title: "Count users",
  description: "Count users matching the given filters, without fetching the users themselves.",
  params: [
    { key: "query", label: "Search query", type: "string", default: "" },
    { key: "banned", label: "Banned only / not banned", type: "boolean" },
  ],
  output: [
    { key: "object", type: "string", label: "Object type" },
    { key: "total_count", type: "number", label: "Total count" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new ClerkClient(ctx).request("/users/count", {
      query: {
        query: p.query as string | undefined,
        banned: typeof p.banned === "boolean" ? p.banned : undefined,
      },
    });
  },
};
export default action;
