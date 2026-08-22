import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `DELETE /v1/checks/{id}` — verified against Checkly's OpenAPI document
 * (`deleteV1ChecksId`).
 *
 * **Deleting a check takes its result history with it.** That is the part worth
 * pausing over: the check itself is a few fields you could recreate, but the
 * record of how the monitored thing behaved is not recoverable. Deactivating
 * (`check-toggle`) stops it running while keeping everything.
 */
const action: ActionDefinition = {
  key: "check-delete",
  type: "perform",
  resource: "check",
  title: "Delete a check",
  description: "Delete a monitor and its result history. Deactivating keeps both.",
  idempotent: true,
  params: [
    { key: "checkId", label: "Check ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I understand the result history goes with it",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Consider Deactivate instead — it stops the check and keeps the history.",
    },
  ],
  output: [
    { key: "checkId", type: "string", label: "Check ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.checkId ?? "").trim();
    if (!id) throw new Error("`checkId` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a check deletes its result history");
    }

    ctx.log("warn", "deleting a Checkly check", { id });

    await new ChecklyClient(ctx).request(`/v1/checks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return { checkId: id, deleted: true };
  },
};

export default action;
