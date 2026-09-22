import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /job_item_users/{job_item_user_id}` — unschedule a person from an
 * item.
 *
 * The only delete route in this API that documents a JSON response at all, and
 * it is an open object (`additionalProperties: true`) with no named fields — so
 * the action reports the status code rather than claiming to know what came
 * back.
 */
interface Input {
  jobItemUserId: number;
}

const jobItemUserDelete: ActionDefinition<Input, { deleted: boolean; status: number }> = {
  key: "job-item-user-delete",
  type: "perform",
  resource: "job-item-user",
  title: "Delete Job Item User",
  description: "Remove a user from a job item's schedule.",
  idempotent: true,
  params: [idParam("jobItemUserId", "Job Item User ID")],
  output: [
    { key: "deleted", type: "boolean", label: "The delete request succeeded" },
    { key: "status", type: "number", label: "HTTP status Streamtime answered with" },
  ],

  async execute(input, ctx) {
    const status = await new StreamtimeClient(ctx).status(
      `/job_item_users/${encodeId(input.jobItemUserId)}`,
      { method: "DELETE" },
    );
    return { deleted: true, status };
  },
};

export default jobItemUserDelete;
