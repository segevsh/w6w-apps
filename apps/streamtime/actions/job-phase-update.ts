import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `PUT /job_phases/{job_phase_id}` — rename a phase. */
interface Input {
  jobPhaseId: number;
  name?: string;
}

const jobPhaseUpdate: ActionDefinition<Input> = {
  key: "job-phase-update",
  type: "perform",
  resource: "job-phase",
  title: "Update Job Phase",
  description: "Rename a job phase. `orderId` is read-only and cannot be set here.",
  idempotent: true,
  params: [
    idParam("jobPhaseId", "Job Phase ID"),
    { key: "name", label: "Name", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Phase ID" },
    { key: "name", type: "string", label: "Phase name" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_phases/${encodeId(input.jobPhaseId)}`, {
      method: "PUT",
      body: compact({ name: input.name }),
    });
  },
};

export default jobPhaseUpdate;
