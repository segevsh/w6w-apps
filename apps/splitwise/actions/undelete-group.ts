import type { ActionDefinition } from "@w6w/types";
import { encodeId, SplitwiseClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

/**
 * `POST /undelete_group/{id}` — restore a deleted group.
 *
 * ## The `errors` array that is not an object
 *
 * This is the endpoint whose 200 response declares `errors` as a **bare array
 * of strings**, where every other endpoint in the API declares it as an object
 * keyed by field. Both shapes are handled by `lib/client.ts#collectErrors`, and
 * this endpoint is the reason it cannot simply read `errors.base`.
 *
 * It is also the reason the emptiness test is on the *flattened* list rather
 * than on `errors` itself: `[]` and `{}` are both truthy in JavaScript, so
 * `if (body.errors)` reports every successful undelete as a failure.
 *
 * > **Note**: 200 OK does not indicate a successful response. You must check
 * > the `success` value of the response.
 *
 * Both channels are checked. Marked `idempotent: true` — restoring an already
 * restored group converges.
 */
interface Input {
  groupId: number;
}

const undeleteGroup: ActionDefinition<Input> = {
  key: "undelete-group",
  type: "perform",
  resource: "group",
  title: "Undelete Group",
  description: "Restore a group deleted with Delete Group.",
  idempotent: true,
  params: [groupIdParam],
  output: [{ key: "success", type: "boolean", label: "Restored" }],

  async execute(input, ctx) {
    const id = encodeId(input.groupId, "groupId");
    await new SplitwiseClient(ctx).request(`/undelete_group/${id}`, { method: "POST" });
    return { success: true };
  },
};

export default undeleteGroup;
