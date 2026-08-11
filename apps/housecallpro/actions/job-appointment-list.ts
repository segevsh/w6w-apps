import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}/appointments` — the appointments on a multi-day job.
 *
 * Unpaginated: the endpoint answers `{appointments: [...]}` with no page or
 * total fields, so those come back undefined.
 */
interface Input {
  jobId: string;
  companyId?: string;
}

const jobAppointmentList: ActionDefinition<Input, NormalizedList> = {
  key: "job-appointment-list",
  type: "read",
  resource: "job",
  title: "List Job Appointments",
  description:
    "List a job's appointments. A multi-day job has more than one, which is also why Update Job " +
    "Schedule refuses those jobs.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    companyIdParam,
  ],
  output: listOutput("Appointments"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list(
      `/jobs/${encodeId(input.jobId)}/appointments`,
      "appointments",
      { companyId: input.companyId },
    );
  },
};

export default jobAppointmentList;
