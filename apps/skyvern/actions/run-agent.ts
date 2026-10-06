import type { ActionDefinition } from "@w6w/types";
import { compact, list, parseJson, SkyvernClient } from "../lib/client.ts";
import { proxyLocationOptions } from "../lib/params.ts";

/**
 * `POST /v1/run/agents` — start a saved agent (what older Skyvern docs call a workflow).
 *
 * The request names the agent as `agent_id` (`wpid_…`); the vendor also accepts `workflow_id` as
 * an alias, which this app does not send.
 */
interface Input {
  agentId: string;
  parameters?: unknown;
  title?: string;
  proxyLocation?: string;
  webhookUrl?: string;
  totpIdentifier?: string;
  totpUrl?: string;
  browserSessionId?: string;
  browserProfileId?: string;
  startFreshBrowser?: boolean;
  maxElapsedTimeMinutes?: number;
  extraHttpHeaders?: unknown;
  runMetadata?: unknown;
  fileIds?: string[] | string;
}

const runAgent: ActionDefinition<Input> = {
  key: "run-agent",
  type: "perform",
  resource: "run",
  title: "Run Agent",
  description:
    "Start a saved Skyvern agent (workflow) by id with parameters. Returns the new run; poll it with Get Run.",
  idempotent: false,
  params: [
    {
      key: "agentId",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "The agent's permanent id (`wpid_…`) — take it from List Agents.",
    },
    {
      key: "parameters",
      label: "Parameters",
      type: "json",
      hint: "Object of values for the agent's input parameters, keyed by parameter name.",
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
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      hint: "Skyvern sends the run's status here when it finishes.",
    },
    { key: "totpIdentifier", label: "TOTP identifier", type: "string" },
    { key: "totpUrl", label: "TOTP URL", type: "string" },
    {
      key: "browserSessionId",
      label: "Browser session ID",
      type: "string",
      hint: "Continue from an existing browser session (`pbs_…`).",
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
      key: "maxElapsedTimeMinutes",
      label: "Max elapsed time (minutes)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Time out the run after this long. Platform default is 240.",
    },
    {
      key: "extraHttpHeaders",
      label: "Extra HTTP headers",
      type: "json",
      hint: "Object of headers added to the browser's requests.",
    },
    {
      key: "runMetadata",
      label: "Run metadata",
      type: "json",
      hint: "Object of string key/values attached to the run for analytics tag filtering.",
    },
    {
      key: "fileIds",
      label: "File IDs",
      type: "string",
      hint: "Comma-separated ids of files uploaded to Skyvern to attach to this run.",
    },
  ],
  output: [
    { key: "run_id", type: "string", label: "Run ID (wr_…)" },
    { key: "status", type: "string", label: "Status" },
    { key: "app_url", type: "string", label: "Skyvern app URL" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json("/v1/run/agents", {
      method: "POST",
      body: compact({
        agent_id: input.agentId,
        parameters: parseJson("Parameters", input.parameters),
        title: input.title,
        proxy_location: input.proxyLocation,
        webhook_url: input.webhookUrl,
        totp_identifier: input.totpIdentifier,
        totp_url: input.totpUrl,
        browser_session_id: input.browserSessionId,
        browser_profile_id: input.browserProfileId,
        start_fresh_browser: input.startFreshBrowser,
        max_elapsed_time_minutes: input.maxElapsedTimeMinutes,
        extra_http_headers: parseJson("Extra HTTP headers", input.extraHttpHeaders),
        run_metadata: parseJson("Run metadata", input.runMetadata),
        file_ids: list(input.fileIds),
      }),
    });
  },
};

export default runAgent;
