import type { ActionDefinition } from "@w6w/types";
import { encodeId, SplitwiseClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

/**
 * `POST /delete_group/{id}` — delete a group and everything in it.
 *
 * > Delete an existing group. **Destroys all associated records (expenses,
 * > etc.)**
 *
 * That sentence is the vendor's, and it is why this action's description
 * repeats it. Undelete Group restores one, so it is not irreversible, but the
 * blast radius is the whole group's expense history rather than the group
 * record alone.
 *
 * ## `success` is the real result, not the status code
 *
 * The 200 response is `{"success": boolean}`. `lib/client.ts` treats a `success`
 * that is present and not `true` as a failure and throws, so this action returns
 * only when the delete actually happened. A caller reading `res.ok` would report
 * every refusal as a success.
 *
 * Marked `idempotent: true`: deleting an already-deleted group converges on the
 * same state, so a retry after a dropped connection is safe.
 */
interface Input {
  groupId: number;
}

const deleteGroup: ActionDefinition<Input> = {
  key: "delete-group",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description:
    "Delete a group. Splitwise destroys all associated records — the group's expenses go with " +
    "it. Reversible with Undelete Group.",
  idempotent: true,
  params: [groupIdParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const id = encodeId(input.groupId, "groupId");
    ctx.log("warn", "deleting Splitwise group and all its expenses", { groupId: id });
    await new SplitwiseClient(ctx).request(`/delete_group/${id}`, { method: "POST" });
    return { success: true };
  },
};

export default deleteGroup;
