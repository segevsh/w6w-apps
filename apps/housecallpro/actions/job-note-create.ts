import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/** `POST /jobs/{job_id}/notes` — append a note to a job. */
interface Input {
  jobId: string;
  content: string;
  companyId?: string;
}

const jobNoteCreate: ActionDefinition<Input> = {
  key: "job-note-create",
  type: "perform",
  resource: "job",
  title: "Add Job Note",
  description: "Append a note to a job. Notes accumulate; this never replaces an existing one.",
  // Notes accumulate and carry no dedupe key, so a retry posts the note twice.
  idempotent: false,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    { key: "content", label: "Note", type: "text", required: true },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "content", type: "string", label: "Note" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/jobs/${encodeId(input.jobId)}/notes`, {
      method: "POST",
      companyId: input.companyId,
      body: { content: input.content },
    });
  },
};

export default jobNoteCreate;
