import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `DELETE /api/systemusers/{id}` (V1) — verified against JumpCloud's V1
 * OpenAPI document (`systemusers_delete`).
 *
 * **Deleting is not suspending, and offboarding usually wants the other one.**
 * A deleted user is gone: their group memberships, their device bindings and
 * their ability to be re-enabled go with them, and JumpCloud has no undelete.
 * Suspending (`user-state-set`) revokes access immediately while keeping the
 * record, which is what an exit checklist normally means by "disable the
 * account".
 *
 * So this action requires an explicit confirmation on top of the id — a blank
 * or wrong field must not be able to destroy a directory record — and says
 * plainly which verb it is.
 */
const action: ActionDefinition = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete a user",
  description: "Permanently delete a directory user. Suspending is usually what offboarding wants.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I understand this cannot be undone",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Consider Suspend instead — it revokes access and keeps the record.",
    },
  ],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a user cannot be undone");
    }

    ctx.log("warn", "deleting a JumpCloud user", { id });

    await new JumpCloudClient(ctx).request(`/systemusers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return { userId: id, deleted: true };
  },
};

export default action;
