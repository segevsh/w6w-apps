import type { ActionDefinition } from "@w6w/types";
import { multipart, MurfClient, PRIORITY_OPTIONS, toList } from "../lib/client.ts";

interface Input {
  fileUrl: string;
  targetLocales: unknown;
  sourceLocale?: string;
  fileName?: string;
  priority?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

const createDubbingJob: ActionDefinition<Input> = {
  key: "create-dubbing-job",
  type: "perform",
  resource: "dubbing-job",
  title: "Create Dubbing Job",
  description:
    "Start a transient Murf Dub job for a file at a public URL (POST /v1/murfdub/jobs/create, multipart with `file_url`). Output links expire after 72 hours and the dub cannot be edited in the Murf UI; use Create Dubbing Job For Project for a persistent one. Poll Get Dubbing Job Status or set a webhook. Needs the Murf Dub API key. Uploading file bytes is not supported here.",
  idempotent: false,
  params: [
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      required: true,
      hint: "A publicly reachable video or audio file.",
    },
    {
      key: "targetLocales",
      label: "Target locales",
      type: "text",
      required: true,
      placeholder: "fr_FR, de_DE",
      hint: "Comma or newline separated; codes from List Dubbing Destination Languages.",
    },
    { key: "sourceLocale", label: "Source locale", type: "string", placeholder: "en_US" },
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
    if (!input.fileUrl?.trim()) throw new Error("fileUrl is required");
    const fields: Array<[string, string]> = [["file_url", input.fileUrl.trim()]];
    for (const l of toList(input.targetLocales, "targetLocales")) {
      fields.push(["target_locales", l]);
    }
    const optional: Array<[string, string | undefined]> = [
      ["source_locale", input.sourceLocale],
      ["file_name", input.fileName],
      ["priority", input.priority],
      ["webhook_url", input.webhookUrl],
      ["webhook_secret", input.webhookSecret],
    ];
    for (const [k, v] of optional) if (v) fields.push([k, v]);
    return await new MurfClient(ctx).call("/v1/murfdub/jobs/create", {
      method: "POST",
      form: multipart(fields),
    });
  },
};

export default createDubbingJob;
