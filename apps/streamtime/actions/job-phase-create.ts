import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /jobs/{job_id}/job_phases` — add a phase to a job.
 *
 * The `JobPhase` model is four fields, two of them read-only: `name` is the
 * whole writable surface. `orderId` is assigned by Streamtime.
 */
interface Input {
  jobId: number;
  name: string;
}

const jobPhaseCreate: ActionDefinition<Input> = {
  key: "job-phase-create",
  type: "perform",
  resource: "job-phase",
  title: "Create Job Phase",
  description: "Create a phase on a job.",
  idempotent: false,
  params: [
    idParam("jobId", "Job ID"),
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Initial Scoping" },
  ],
  output: [
    { key: "id", type: "number", label: "New phase ID" },
    { key: "name", type: "string", label: "Phase name" },
    { key: "jobId", type: "number", label: "Job ID" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/jobs/${encodeId(input.jobId)}/job_phases`, {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default jobPhaseCreate;
