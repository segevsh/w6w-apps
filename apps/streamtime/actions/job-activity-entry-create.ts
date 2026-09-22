import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /jobs/{job_id}/activity_entries` — post a comment on a job.
 *
 * The whole documented body is `{ "message": <string> }`. The vendor's summary
 * says "Creates a **comment** activity entry", so this is the only kind of entry
 * this route makes; system entries appear from the activity inside Streamtime
 * itself.
 */
interface Input {
  jobId: number;
  message: string;
}

const jobActivityEntryCreate: ActionDefinition<Input> = {
  key: "job-activity-entry-create",
  type: "perform",
  resource: "job",
  title: "Create Job Comment",
  description: "Add a comment to a job's activity feed.",
  idempotent: false,
  params: [
    idParam("jobId", "Job ID"),
    { key: "message", label: "Message", type: "text", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Activity entry ID" },
    { key: "createdDatetime", type: "string", label: "Created at" },
    { key: "activityEntryType", type: "object", label: "Entry type — `{ name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/jobs/${encodeId(input.jobId)}/activity_entries`,
      { method: "POST", body: { message: input.message } },
    );
  },
};

export default jobActivityEntryCreate;
