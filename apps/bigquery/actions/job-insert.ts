import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, compact, json, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /projects/{projectId}/jobs` — verified against BigQuery's discovery
 * document (`jobs.insert`).
 *
 * The asynchronous door: a **load**, **extract**, **copy** or long-running
 * **query** job. `query-run` is the synchronous convenience for queries; this
 * is what you use when the work outlives a request.
 *
 * The `configuration` is passed as JSON because it is a discriminated union —
 * exactly one of `query`, `load`, `extract` or `copy`, each with its own
 * required fields — and flattening it into form fields would make three of the
 * four unreachable.
 *
 * **Loads and extracts move data through Cloud Storage**, which needs a
 * `devstorage.*` scope this app deliberately does not request. Such a job will
 * be accepted and then fail on permissions; the app asks for the narrow
 * `bigquery` scope on purpose, and that trade is stated here rather than
 * discovered at runtime.
 */
const action: ActionDefinition = {
  key: "job-insert",
  type: "perform",
  resource: "job",
  title: "Start a job",
  description: "Start an asynchronous query, load, extract or copy job.",
  // A job id makes a retry safe; without one BigQuery starts a second job.
  idempotent: false,
  params: [
    PROJECT_PARAM,
    {
      key: "configuration",
      label: "Configuration",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"query":{"query":"SELECT 1","useLegacySql":false,' +
        '"destinationTable":{"projectId":"p","datasetId":"d","tableId":"t"}}}',
      hint: "Exactly one of query / load / extract / copy.",
    },
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      default: "",
      hint: "Supply your own to make a retry safe — BigQuery rejects a duplicate id.",
    },
    {
      key: "useInvocationJobId",
      label: "Use This Step's ID",
      type: "boolean",
      default: false,
      hint: "Derive the job id from this step's invocation id, so a retry re-attaches to the " +
        "same job instead of starting a second one.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
      hint: "Required when the data is not in the region BigQuery infers.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "jobReference", type: "object", label: "Job reference" },
    { key: "status", type: "object", label: "Status" },
    { key: "statistics", type: "object", label: "Statistics" },
    { key: "configuration", type: "object", label: "Configuration as accepted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const configuration = json(p.configuration, "configuration");
    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
      throw new Error("`configuration` is required — a JSON object");
    }

    const kinds = ["query", "load", "extract", "copy"].filter(
      (k) => k in (configuration as Record<string, unknown>),
    );
    if (kinds.length === 0) {
      throw new Error("`configuration` must contain one of query, load, extract or copy");
    }
    if (kinds.length > 1) {
      // BigQuery takes exactly one; naming both beats a vague 400.
      throw new Error(`\`configuration\` must contain only one job type — got ${kinds.join(", ")}`);
    }

    let jobId = String(p.jobId ?? "").trim();
    if (!jobId && p.useInvocationJobId === true && ctx.invocation?.invocationId) {
      // BigQuery job ids allow letters, numbers, underscores and dashes.
      jobId = `w6w_${ctx.invocation.invocationId.replace(/[^A-Za-z0-9_-]/g, "_")}`;
    }

    const location = String(p.location ?? "").trim();
    const body = compact({
      configuration,
      jobReference: jobId || location
        ? compact({
          projectId: project,
          jobId: jobId || undefined,
          location: location || undefined,
        })
        : undefined,
    });

    ctx.log("info", "starting a BigQuery job", { project, type: kinds[0], jobId: jobId || "auto" });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/jobs`,
      { method: "POST", body },
    );
  },
};

export default action;
