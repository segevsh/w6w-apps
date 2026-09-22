import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam } from "../lib/params.ts";

/**
 * `POST /jobs/{job_id}/duplicate` — duplicate a job, "with various configurable
 * options".
 *
 * The document is explicit that the body is an object of
 * `additionalProperties: true` and lists **no** fields and no description of
 * any. So the options are passed through verbatim as a JSON object and none are
 * invented: a guessed field name would either be ignored or, worse, silently
 * reinterpreted by the vendor. Send `{}` (or nothing) to duplicate with
 * Streamtime's own defaults.
 *
 * The response is the new `Job`.
 */
interface Input {
  jobId: number;
  options?: unknown;
}

const jobDuplicate: ActionDefinition<Input> = {
  key: "job-duplicate",
  type: "perform",
  resource: "job",
  title: "Duplicate Job",
  description:
    "Duplicate a job. Streamtime does not document the options object, so any options are passed " +
    "through exactly as given.",
  // Each call creates a new job; nothing on the wire makes a repeat a no-op.
  idempotent: false,
  params: [
    idParam("jobId", "Job ID", "The job to duplicate."),
    {
      key: "options",
      label: "Duplicate Options",
      type: "json",
      hint: "Streamtime documents this body as an open object with no named fields, so it is " +
        "forwarded unchanged. Omit it to use the vendor's defaults.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New job ID" },
    { key: "name", type: "string", label: "Job name" },
    { key: "companyId", type: "number", label: "Company ID" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/jobs/${encodeId(input.jobId)}/duplicate`, {
      method: "POST",
      body: asOptionalJson<Record<string, unknown>>(input.options, "options") ?? {},
    });
  },
};

export default jobDuplicate;
