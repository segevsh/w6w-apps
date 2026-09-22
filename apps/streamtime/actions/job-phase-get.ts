import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /job_phases/{job_phase_id}` — one phase. */
interface Input {
  jobPhaseId: number;
}

const jobPhaseGet: ActionDefinition<Input> = {
  key: "job-phase-get",
  type: "read",
  resource: "job-phase",
  title: "Get Job Phase",
  description: "Fetch one job phase by id.",
  params: [idParam("jobPhaseId", "Job Phase ID")],
  output: [
    { key: "id", type: "number", label: "Phase ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "name", type: "string", label: "Phase name" },
    { key: "orderId", type: "number", label: "Display order" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_phases/${encodeId(input.jobPhaseId)}`);
  },
};

export default jobPhaseGet;
