import type { ActionDefinition } from "@w6w/types";
import { multipart, MurfClient, PRIORITY_OPTIONS } from "../lib/client.ts";

interface Input {
  projectId: string;
  fileUrl: string;
  fileName?: string;
  priority?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

const createDubbingJobForProject: ActionDefinition<Input> = {
  key: "create-dubbing-job-for-project",
  type: "perform",
  resource: "dubbing-job",
  title: "Create Dubbing Job For Project",
  description:
    "Start a persistent, project-based Murf Dub job for a file at a public URL (POST /v1/murfdub/jobs/create-with-project-id, multipart with `file_url`). The dub stays editable in the Murf Dubbing platform. The project's source and target locales apply. Needs the Murf Dub API key. Uploading file bytes is not supported here.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "fileUrl", label: "File URL", type: "string", required: true },
    { key: "fileName", label: "File name", type: "string" },
    { key: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS },
    { key: "webhookUrl", label: "Webhook URL", type: "string" },
    { key: "webhookSecret", label: "Webhook secret", type: "secret" },
  ],
  output: [
    { key: "job_id", type: "string", label: "Job ID" },
    { key: "dubbing_type", type: "string", label: "AUTOMATED or QA" },
    { key: "file_name", type: "string", label: "File name" },
    { key: "priority", type: "string", label: "Priority" },
    { key: "source_locale", type: "string", label: "Source locale" },
    { key: "target_locales", type: "array", label: "Target locales" },
    { key: "warning", type: "string", label: "Warning" },
  ],

  async execute(input, ctx) {
    if (!input.projectId?.trim()) throw new Error("projectId is required");
    if (!input.fileUrl?.trim()) throw new Error("fileUrl is required");
    const fields: Array<[string, string]> = [
      ["project_id", input.projectId.trim()],
      ["file_url", input.fileUrl.trim()],
    ];
    const optional: Array<[string, string | undefined]> = [
      ["file_name", input.fileName],
      ["priority", input.priority],
      ["webhook_url", input.webhookUrl],
      ["webhook_secret", input.webhookSecret],
    ];
    for (const [k, v] of optional) if (v) fields.push([k, v]);
    return await new MurfClient(ctx).call("/v1/murfdub/jobs/create-with-project-id", {
      method: "POST",
      form: multipart(fields),
    });
  },
};

export default createDubbingJobForProject;
