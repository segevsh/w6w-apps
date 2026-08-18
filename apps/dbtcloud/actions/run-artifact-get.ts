import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, json } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/{account}/runs/{id}/artifacts/{path}` — download what a
 * run produced.
 *
 * ## Why a workflow wants these
 *
 * The artifacts are the only machine-readable account of what a dbt build
 * actually did:
 *
 *   - **`run_results.json`** — every node with its status, timing and error
 *     message. This is what turns "the build failed" into "these four models
 *     failed, here is why, and here is what took nineteen minutes".
 *   - **`manifest.json`** — the whole project: models, sources, tests, and the
 *     dependency graph between them. It is what downstream tooling reads to
 *     know what exists. It is also **large** — tens of megabytes on a big
 *     project — which is the reason for the parsing option below.
 *   - **`catalog.json`** — columns and types as they exist in the warehouse,
 *     and only present if the job ran `dbt docs generate`.
 *
 * ## Artifacts are per-step, and the default is the last one
 *
 * A job with several dbt commands produces artifacts for each. Asking without a
 * `step` gives the **last** step's, which for a job whose final command is
 * `dbt test` is not the `run_results.json` of the build. `run-artifact-list`
 * shows what each step left.
 *
 * ## Parsed or raw
 *
 * By default this parses the JSON, which is what a workflow branching on
 * results wants. `manifest.json` on a large project can be big enough that
 * parsing it into a step's output is a mistake, so `raw` returns the text
 * untouched and `summarize` returns only the per-node results from
 * `run_results.json` — the part anyone actually reads.
 */
const KNOWN = ["run_results.json", "manifest.json", "catalog.json", "semantic_manifest.json"];

const action: ActionDefinition = {
  key: "run-artifact-get",
  type: "read",
  resource: "artifact",
  title: "Download a run artifact",
  description:
    "Fetch `run_results.json`, `manifest.json` or `catalog.json` from a finished run — the only " +
    "machine-readable account of what the build did.",
  params: [
    { key: "runId", label: "Run ID", type: "string", required: true, default: "" },
    {
      key: "path",
      label: "Artifact",
      type: "string",
      required: true,
      default: "run_results.json",
      placeholder: "run_results.json",
      hint: "`run_results.json` (per-node status and timing), `manifest.json` (the project " +
        "graph — large), `catalog.json` (warehouse columns, only if the job generated docs).",
    },
    {
      key: "step",
      label: "Step",
      type: "number",
      default: 0,
      hint: "1-based index of the run step. Blank or 0 means the LAST step, which on a job " +
        "ending in `dbt test` is not the build's results.",
    },
    {
      key: "mode",
      label: "Return",
      type: "select",
      default: "parsed",
      options: [
        { value: "parsed", label: "Parsed JSON" },
        { value: "summary", label: "Node results only — run_results.json's useful half" },
        { value: "raw", label: "Raw text — for manifest.json, which can be very large" },
      ],
    },
  ],
  output: [
    { key: "artifact", type: "object", label: "The parsed artifact" },
    { key: "raw", type: "string", label: "The raw text, in raw mode" },
    { key: "results", type: "array", label: "Per-node results, in summary mode" },
    { key: "failed", type: "array", label: "Nodes that did not pass, in summary mode" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const runId = String(p.runId ?? "").trim();
    if (!runId) throw new Error("`runId` is required");
    const path = String(p.path ?? "run_results.json").trim().replace(/^\/+/, "");
    if (!path) throw new Error("`path` is required");
    const step = Number(p.step ?? 0);
    const mode = p.mode === undefined ? "parsed" : String(p.mode);

    const client = new DbtCloudClient(ctx);
    const text = await client.request<string>(
      `/api/v2/accounts/${client.accountId}/runs/${encodeURIComponent(runId)}/artifacts/${
        path.split("/").map(encodeURIComponent).join("/")
      }`,
      { query: { step: step > 0 ? step : undefined }, raw: true },
    );

    ctx.log("info", "downloaded a dbt Cloud artifact", { runId, path, bytes: text.length });
    if (mode === "raw") return { raw: text };

    const parsed = json(text, path) as { results?: Array<{ status?: string }> } | undefined;
    if (mode === "summary") {
      const results = parsed?.results;
      if (!Array.isArray(results)) {
        throw new Error(
          `summary mode expects a run_results.json shape; ${path} has no \`results\` array`,
        );
      }
      const failed = results.filter((r) => r?.status && !["success", "pass"].includes(r.status));
      return { results, failed, count: results.length, failedCount: failed.length };
    }
    return { artifact: parsed };
  },
};

/** The artifacts a job normally produces, named so the UI can suggest them. */
export const KNOWN_ARTIFACTS = KNOWN;

export default action;
