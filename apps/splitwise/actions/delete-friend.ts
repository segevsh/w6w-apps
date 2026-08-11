import type { ActionDefinition } from "@w6w/types";
import { encodeId, SplitwiseClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

/**
 * `POST /delete_friend/{id}` — break off a friendship.
 *
 * > Given a friend ID, break off the friendship between the current user and
 * > the specified user.
 *
 * The `{id}` is the friend's **user** id, as on Get Friend. There is no
 * "undelete friend" endpoint — unlike groups and expenses, this one does not
 * come back, and re-adding via Create Friend starts a fresh friendship rather
 * than restoring balances.
 *
 * > **Note**: 200 OK does not indicate a successful response. You must check
 * > the `success` value of the response.
 *
 * Marked `idempotent: true` — deleting an already-absent friendship converges.
 */
interface Input {
  userId: number;
}

const deleteFriend: ActionDefinition<Input> = {
  key: "delete-friend",
  type: "perform",
  resource: "friend",
  title: "Delete Friend",
  description:
    "Break off a friendship, by the friend's user id. Splitwise publishes no endpoint to restore " +
    "one.",
  idempotent: true,
  params: [{ ...userIdParam, hint: "The friend's user id, from List Friends." }],
  output: [{ key: "success", type: "boolean", label: "Friendship removed" }],

  async execute(input, ctx) {
    const id = encodeId(input.userId, "userId");
    ctx.log("warn", "deleting a Splitwise friendship — this cannot be undone", { userId: id });
    await new SplitwiseClient(ctx).request(`/delete_friend/${id}`, { method: "POST" });
    return { success: true };
  },
};

export default deleteFriend;
