import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `PUT /jobs/{job_id}/job_status?job_status_id={id}` — move a job to a status.
 *
 * The new status travels as a **query parameter**, not in the body, which is
 * unusual enough to be worth stating: the route takes no request body at all.
 *
 * Streamtime's description adds "May trigger validation for active/archived
 * limits" — a plan-limits rejection arrives here, not at update time, so this is
 * the call whose failure means "you have too many active jobs", not "the request
 * was malformed".
 *
 * The documented 200 is an open object (`additionalProperties: true`, no named
 * fields), so the action reports the status code it received alongside whatever
 * body came back instead of pretending to know the shape.
 */
interface Input {
  jobId: number;
  jobStatusId: number;
}

const jobStatusUpdate: ActionDefinition<Input, { status: number; result: unknown }> = {
  key: "job-status-update",
  type: "perform",
  resource: "job",
  title: "Update Job Status",
  description:
    "Set a job's status. Streamtime may reject this for active/archived plan limits even when the " +
    "job itself is valid.",
  idempotent: true,
  params: [
    idParam("jobId", "Job ID"),
    idParam("jobStatusId", "New Job Status ID", "The status id, not its name."),
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status Streamtime answered with" },
    { key: "result", type: "object", label: "Response body" },
  ],

  async execute(input, ctx) {
    const { status, body } = await new StreamtimeClient(ctx).statusAndJson(
      `/jobs/${encodeId(input.jobId)}/job_status`,
      { method: "PUT", query: { job_status_id: input.jobStatusId } },
    );
    return { status, result: body ?? null };
  },
};

export default jobStatusUpdate;
