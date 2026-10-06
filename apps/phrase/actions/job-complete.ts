import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `POST /v2/projects/{projectId}/jobs/{jobId}/complete` — mark a job completed.
 */
interface Input {
  projectId: string;
  jobId: string;
  branch?: string;
}

const jobComplete: ActionDefinition<Input> = {
  key: "job-complete",
  type: "perform",
  resource: "job",
  title: "Complete Job",
  description: "Mark a job completed.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "jobId", label: "Job ID", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/jobs/${encodeId(input.jobId)}/complete`,
      { method: "POST", body: { branch: input.branch } },
    );
  },
};

export default jobComplete;
