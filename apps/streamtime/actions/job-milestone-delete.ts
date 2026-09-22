import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /job_milestones/{job_milestone_id}` — delete a milestone.
 *
 * The document describes the 200 with the copy-pasted sentence "Job milestone
 * fetched." and declares no body, so the action reports the deletion it asked
 * for and the status code, rather than inventing a payload.
 */
interface Input {
  jobMilestoneId: number;
}

const jobMilestoneDelete: ActionDefinition<Input, { deleted: boolean; status: number }> = {
  key: "job-milestone-delete",
  type: "perform",
  resource: "job-milestone",
  title: "Delete Job Milestone",
  description: "Delete a job milestone.",
  idempotent: true,
  params: [idParam("jobMilestoneId", "Job Milestone ID")],
  output: [
    { key: "deleted", type: "boolean", label: "The delete request succeeded" },
    { key: "status", type: "number", label: "HTTP status Streamtime answered with" },
  ],

  async execute(input, ctx) {
    const status = await new StreamtimeClient(ctx).status(
      `/job_milestones/${encodeId(input.jobMilestoneId)}`,
      { method: "DELETE" },
    );
    return { deleted: true, status };
  },
};

export default jobMilestoneDelete;
