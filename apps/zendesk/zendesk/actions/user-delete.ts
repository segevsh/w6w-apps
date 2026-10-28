import type { ActionDefinition } from "@w6w/types";
import { ZendeskClient } from "../lib/client.ts";

/**
 * Soft-deletes the user. Their tickets are kept and reattributed to a deleted
 * placeholder; permanent erasure is a separate GDPR endpoint.
 */
const userDelete: ActionDefinition<{ userId: number }> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description:
    "Soft-delete a user. Their tickets remain; permanent erasure is a separate GDPR request.",
  idempotent: true,
  params: [{ key: "userId", label: "User ID", type: "number", required: true }],
  output: [{ key: "user.id", type: "number", label: "User ID" }],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/users/${input.userId}.json`, { method: "DELETE" });
  },
};

export default userDelete;
