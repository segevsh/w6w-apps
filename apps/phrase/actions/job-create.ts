import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient, toArray } from "../lib/client.ts";

/**
 * `POST /v2/projects/{projectId}/jobs` — create a translation job, optionally with keys and target locales.
 */
interface Input {
  projectId: string;
  name: string;
  branch?: string;
  sourceLocaleId?: string;
  briefing?: string;
  dueDate?: string;
  ticketUrl?: string;
  tags?: string[] | string;
  translationKeyIds?: string[] | string;
  targetLocaleIds?: string[] | string;
  jobTemplateId?: string;
}

const jobCreate: ActionDefinition<Input> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description: "Create a translation job, optionally with keys and target locales.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    { key: "sourceLocaleId", label: "Source locale ID", type: "string" },
    { key: "briefing", label: "Briefing", type: "text" },
    { key: "dueDate", label: "Due date", type: "datetime", hint: "ISO 8601." },
    { key: "ticketUrl", label: "Ticket URL", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Add every key with these tags (comma-separated).",
    },
    {
      key: "translationKeyIds",
      label: "Key IDs",
      type: "string",
      hint: "Comma-separated key ids to include.",
    },
    {
      key: "targetLocaleIds",
      label: "Target locale IDs",
      type: "string",
      hint: "Comma-separated locale ids.",
    },
    { key: "jobTemplateId", label: "Job template ID", type: "string" },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}/jobs`, {
      method: "POST",
      body: {
        name: input.name,
        branch: input.branch,
        source_locale_id: input.sourceLocaleId,
        briefing: input.briefing,
        due_date: input.dueDate,
        ticket_url: input.ticketUrl,
        tags: toArray(input.tags),
        translation_key_ids: toArray(input.translationKeyIds),
        target_locale_ids: toArray(input.targetLocaleIds),
        job_template_id: input.jobTemplateId,
      },
    });
  },
};

export default jobCreate;
