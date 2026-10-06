import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `POST /v2/projects/{projectId}/jobs/{jobId}/start` — move a draft job to in progress.
 */
interface Input {
  projectId: string;
  jobId: string;
  branch?: string;
}

const jobStart: ActionDefinition<Input> = {
  key: "job-start",
  type: "perform",
  resource: "job",
  title: "Start Job",
  description: "Move a draft job to in progress.",
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
      `/projects/${encodeId(input.projectId)}/jobs/${encodeId(input.jobId)}/start`,
      { method: "POST", body: { branch: input.branch } },
    );
  },
};

export default jobStart;
