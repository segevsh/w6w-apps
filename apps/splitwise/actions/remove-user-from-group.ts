import type { ActionDefinition } from "@w6w/types";
import { SplitwiseClient } from "../lib/client.ts";
import { groupIdParam, userIdParam } from "../lib/params.ts";

/**
 * `POST /remove_user_from_group` — take someone out of a group.
 *
 * > Remove a user from a group. **Does not succeed if the user has a non-zero
 * > balance.**
 *
 * That is the interesting part, and it arrives as a **200** with `success:
 * false` and an `errors` payload rather than as an HTTP error. `lib/client.ts`
 * turns it into a thrown error carrying Splitwise's own message, so a workflow
 * sees "this person still owes money" instead of a silent no-op that looks like
 * a success.
 *
 * Both ids go in the body, not the path — this endpoint takes no path
 * parameter. Marked `idempotent: true`: removing an already-absent member
 * converges on the same state.
 */
interface Input {
  groupId: number;
  userId: number;
}

const removeUserFromGroup: ActionDefinition<Input> = {
  key: "remove-user-from-group",
  type: "perform",
  resource: "group",
  title: "Remove User From Group",
  description:
    "Remove a user from a group. Splitwise refuses while that user has a non-zero balance in it.",
  idempotent: true,
  params: [
    groupIdParam,
    { ...userIdParam, hint: "The member to remove. Their balance in the group must be zero." },
  ],
  output: [{ key: "success", type: "boolean", label: "Removed" }],

  execute(input, ctx) {
    const groupId = Number(input.groupId);
    const userId = Number(input.userId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error(`groupId must be a positive integer id, got "${String(input.groupId)}"`);
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error(`userId must be a positive integer id, got "${String(input.userId)}"`);
    }
    return new SplitwiseClient(ctx)
      .request("/remove_user_from_group", {
        method: "POST",
        body: { group_id: groupId, user_id: userId },
      })
      .then(() => ({ success: true }));
  },
};

export default removeUserFromGroup;
