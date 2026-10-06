import type { ActionDefinition } from "@w6w/types";
import { GraphClient, userPath } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
}

/**
 * `DELETE /users/{id | userPrincipalName}`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-delete?view=graph-rest-1.0
 *
 * Answers `204 No Content`. The user is **soft-deleted**: it moves to the directory's deleted items
 * for 30 days and can be brought back with Restore Deleted Item, after which it is gone for good.
 * The calling user needs the User Administrator or Privileged Authentication Administrator role;
 * deleting a user who holds a privileged admin role needs a higher one still.
 *
 * `idempotent: true` as a retry guard: a second delete of the same id is a `404`, which leaves the
 * directory in the same state.
 */
const deleteUser: ActionDefinition<Input, { deleted: boolean; userId: string }> = {
  key: "delete-user",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Delete a user. It stays restorable from deleted items for 30 days.",
  idempotent: true,
  params: [userIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "userId", type: "string", label: "User id or principal name" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    ctx.log("info", "deleting user", { userId: input.userId });
    await client.request(userPath(input.userId), { method: "DELETE" });
    return { deleted: true, userId: input.userId };
  },
};

export default deleteUser;
