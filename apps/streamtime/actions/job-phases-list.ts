import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}/job_phases` — a job's phases, in display order.
 *
 * A phase is `{ id, jobId, name, orderId }`. The nesting that follows is worth
 * knowing before scheduling anything: job **items** carry `jobPhaseId`, and job
 * **items** also own the roles, users and sub-items — a phase has no scheduled
 * people of its own.
 */
interface Input {
  jobId: number;
}

const jobPhasesList: ActionDefinition<Input> = {
  key: "job-phases-list",
  type: "search",
  resource: "job-phase",
  title: "List Job Phases",
  description: "List a job's phases in order.",
  params: [idParam("jobId", "Job ID")],
  output: [
    { key: "phases", type: "array", label: "Phases — `{ id, jobId, name, orderId }`" },
  ],

  async execute(input, ctx) {
    const phases = await new StreamtimeClient(ctx).request<unknown[]>(
      `/jobs/${encodeId(input.jobId)}/job_phases`,
    );
    return { phases: phases ?? [] };
  },
};

export default jobPhasesList;
