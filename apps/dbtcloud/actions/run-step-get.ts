import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, runStatusName } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/{account}/steps/{id}/` — one command inside a run.
 *
 * A dbt Cloud run is several commands in sequence — `dbt deps`, `dbt seed`,
 * `dbt run`, `dbt test` — and each is a step with its own status, timing and
 * logs. When a run fails, the interesting question is which step, and this is
 * where the answer lives with the output attached.
 *
 * ## The logs are the reason to be careful
 *
 * A step carries `logs` (dbt's own output) and `debug_logs` (everything,
 * including per-query detail). On a large project the debug log is measured in
 * megabytes, and putting it in a workflow's step output means storing it,
 * passing it along and rendering it. So logs are **off by default** here, and
 * the tail-only option exists because the last fifty lines contain the error
 * and the rest is a build transcript.
 *
 * Step ids come from `run-get` with `include_related=run_steps`.
 */
const action: ActionDefinition = {
  key: "run-step-get",
  type: "read",
  resource: "run",
  title: "Get a run step",
  description:
    "One command inside a run, with its status and — opt-in — its logs. The debug log can be " +
    "megabytes, so the default returns neither.",
  params: [
    {
      key: "stepId",
      label: "Step ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `run-get` with `include_related=run_steps`.",
    },
    {
      key: "logs",
      label: "Logs",
      type: "select",
      default: "none",
      options: [
        { value: "none", label: "No logs" },
        { value: "tail", label: "Last 50 lines — where the error is" },
        { value: "full", label: "Everything dbt printed" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Step ID" },
    { key: "name", type: "string", label: "The dbt command" },
    { key: "status", type: "number", label: "Status number" },
    { key: "statusName", type: "string", label: "Status, named" },
    { key: "logs", type: "string", label: "Output, when asked for" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const stepId = String(p.stepId ?? "").trim();
    if (!stepId) throw new Error("`stepId` is required");
    const mode = p.logs === undefined ? "none" : String(p.logs);

    const client = new DbtCloudClient(ctx);
    const step = await client.request<{ status?: number; logs?: string; debug_logs?: string }>(
      `/api/v2/accounts/${client.accountId}/steps/${encodeURIComponent(stepId)}/`,
    );

    const { logs, debug_logs: _debug, ...rest } = step ?? {};
    const out: Record<string, unknown> = { ...rest, statusName: runStatusName(step?.status) };
    if (mode === "full") out.logs = logs;
    if (mode === "tail" && typeof logs === "string") {
      out.logs = logs.split("\n").slice(-50).join("\n");
    }
    return out;
  },
};

export default action;
