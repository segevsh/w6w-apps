import type { ActionDefinition } from "@w6w/types";
import { compact, list, parseJson, SkyvernClient } from "../lib/client.ts";
import { proxyLocationOptions } from "../lib/params.ts";

/**
 * `POST /v1/run/tasks` — start a one-off task from a natural-language goal.
 *
 * Returns immediately with the run (`status` `created`/`queued`); poll `run-get` for the result.
 */
interface Input {
  prompt: string;
  url?: string;
  engine?: string;
  title?: string;
  proxyLocation?: string;
  dataExtractionSchema?: unknown;
  errorCodeMapping?: unknown;
  maxSteps?: number;
  webhookUrl?: string;
  totpIdentifier?: string;
  totpUrl?: string;
  browserSessionId?: string;
  browserProfileId?: string;
  startFreshBrowser?: boolean;
  extraHttpHeaders?: unknown;
  fileIds?: string[] | string;
}

const runTask: ActionDefinition<Input> = {
  key: "run-task",
  type: "perform",
  resource: "run",
  title: "Run Task",
  description:
    "Start a one-off Skyvern task from a plain-language goal. Returns the new run; poll it with Get Run.",
  idempotent: false,
  params: [
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      hint: 'The goal for Skyvern to accomplish, e.g. "Find the top post on Hacker News".',
    },
    {
      key: "url",
      label: "Start URL",
      type: "string",
      hint: "Where to start. If empty, Skyvern picks one from the prompt.",
    },
    {
      key: "engine",
      label: "Engine",
      type: "select",
      options: [
        { value: "skyvern-1.0", label: "Skyvern 1.0 (simple tasks; default)" },
        { value: "skyvern-2.0", label: "Skyvern 2.0 (complex multi-step)" },
        { value: "skyvern-3.0", label: "Skyvern 3.0" },
        { value: "openai-cua", label: "OpenAI CUA" },
        { value: "anthropic-cua", label: "Anthropic CUA" },
        { value: "ui-tars", label: "UI-TARS" },
        { value: "yutori-navigator", label: "Yutori Navigator" },
      ],
    },
    { key: "title", label: "Title", type: "string" },
    {
      key: "proxyLocation",
      label: "Proxy location",
      type: "select",
      options: proxyLocationOptions,
      hint: "Skyvern Cloud only. Defaults to RESIDENTIAL.",
    },
    {
      key: "dataExtractionSchema",
      label: "Data extraction schema",
      type: "json",
      hint: "JSON Schema (or a description) of the data to return in `output`.",
    },
    {
      key: "errorCodeMapping",
      label: "Error code mapping",
      type: "json",
      hint: "Object mapping your own error codes to the conditions that should raise them.",
    },
    {
      key: "maxSteps",
      label: "Max steps",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "The task fails past this many steps. Skyvern bills per step, so set a ceiling.",
    },
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      hint: "Skyvern POSTs the final run here when it finishes.",
    },
    { key: "totpIdentifier", label: "TOTP identifier", type: "string" },
    { key: "totpUrl", label: "TOTP URL", type: "string" },
    {
      key: "browserSessionId",
      label: "Browser session ID",
      type: "string",
      hint: "Run inside an existing browser session (`pbs_…`) to keep its login and page state.",
    },
    {
      key: "browserProfileId",
      label: "Browser profile ID",
      type: "string",
      hint: "Reuse a saved browser profile (`bp_…`).",
    },
    {
      key: "startFreshBrowser",
      label: "Start fresh browser",
      type: "boolean",
      hint: "Ignore any saved browser memory for this run.",
    },
    {
      key: "extraHttpHeaders",
      label: "Extra HTTP headers",
      type: "json",
      hint: "Object of headers added to the browser's requests.",
    },
    {
      key: "fileIds",
      label: "File IDs",
      type: "string",
      hint: "Comma-separated ids of files uploaded to Skyvern to attach to this run.",
    },
  ],
  output: [
    { key: "run_id", type: "string", label: "Run ID (tsk_…)" },
    { key: "status", type: "string", label: "Status" },
    { key: "app_url", type: "string", label: "Skyvern app URL" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json("/v1/run/tasks", {
      method: "POST",
      body: compact({
        prompt: input.prompt,
        url: input.url,
        engine: input.engine,
        title: input.title,
        proxy_location: input.proxyLocation,
        data_extraction_schema: parseJson("Data extraction schema", input.dataExtractionSchema),
        error_code_mapping: parseJson("Error code mapping", input.errorCodeMapping),
        max_steps: input.maxSteps,
        webhook_url: input.webhookUrl,
        totp_identifier: input.totpIdentifier,
        totp_url: input.totpUrl,
        browser_session_id: input.browserSessionId,
        browser_profile_id: input.browserProfileId,
        start_fresh_browser: input.startFreshBrowser,
        extra_http_headers: parseJson("Extra HTTP headers", input.extraHttpHeaders),
        file_ids: list(input.fileIds),
      }),
    });
  },
};

export default runTask;
