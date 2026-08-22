import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/{account}/runs/{id}/artifacts/` — what did this run
 * leave behind?
 *
 * The answer is a list of paths, and it varies by what the job actually ran: a
 * job with no `dbt docs generate` step produces no `catalog.json`, and a run
 * that failed before compiling may produce nothing at all.
 *
 * That is why this exists as its own action rather than being folded into the
 * download. Asking first is how a workflow avoids a 404 that reads like a
 * broken integration when the real answer is "that job does not generate docs".
 */
const action: ActionDefinition = {
  key: "run-artifact-list",
  type: "read",
  resource: "artifact",
  title: "List a run's artifacts",
  description:
    "The artifact paths a run produced. Worth asking before downloading — a job with no docs " +
    "step has no catalog.json, and a 404 reads like a broken integration.",
  params: [
    { key: "runId", label: "Run ID", type: "string", required: true, default: "" },
    {
      key: "step",
      label: "Step",
      type: "number",
      default: 0,
      advanced: true,
      hint: "1-based index of the run step. Blank or 0 means the last step.",
    },
  ],
  output: [
    { key: "paths", type: "array", label: "Artifact paths" },
    { key: "count", type: "number", label: "Artifacts produced" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const runId = String(p.runId ?? "").trim();
    if (!runId) throw new Error("`runId` is required");
    const step = Number(p.step ?? 0);

    const client = new DbtCloudClient(ctx);
    const paths = await client.request<string[]>(
      `/api/v2/accounts/${client.accountId}/runs/${encodeURIComponent(runId)}/artifacts/`,
      { query: { step: step > 0 ? step : undefined } },
    );
    const list = Array.isArray(paths) ? paths : [];
    return { paths: list, count: list.length };
  },
};

export default action;
