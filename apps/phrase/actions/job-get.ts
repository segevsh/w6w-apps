import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/projects/{projectId}/jobs/{jobId}` — fetch one job with its locales and keys.
 */
interface Input {
  projectId: string;
  jobId: string;
  branch?: string;
  omitTranslationKeys?: boolean;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Fetch one job with its locales and keys.",
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
    {
      key: "omitTranslationKeys",
      label: "Omit translation keys",
      type: "boolean",
      hint: "Smaller payload for big jobs.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State" },
    { key: "due_date", type: "string", label: "Due date" },
    { key: "briefing", type: "string", label: "Briefing" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/jobs/${encodeId(input.jobId)}`,
      {
        method: "GET",
        query: { branch: input.branch, omit_translation_keys: input.omitTranslationKeys },
      },
    );
  },
};

export default jobGet;
