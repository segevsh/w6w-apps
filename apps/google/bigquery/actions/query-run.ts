import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, compact, decodeRows, json, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /projects/{projectId}/queries` — verified against BigQuery's discovery
 * document (`jobs.query`, request `QueryRequest`, response `QueryResponse`).
 *
 * The core action. Three things about it that catch people out, all handled
 * here:
 *
 *   - **It can time out without failing.** `timeoutMs` is how long BigQuery
 *     waits before *returning*, not a query cancellation. When it elapses the
 *     response comes back with `jobComplete: false` and a `jobReference` — the
 *     query is still running. This action surfaces that as `jobComplete` rather
 *     than pretending it finished; `job-query-results` fetches the rows once it
 *     has.
 *   - **Rows are positional, not named.** BigQuery returns
 *     `{f: [{v: "ada"}, {v: "36"}]}` against a separate schema. The raw form is
 *     returned untouched *and* a decoded `rows` array is added — see
 *     `lib/client.ts` for why values stay strings.
 *   - **Dry run costs nothing.** With Dry Run on, BigQuery validates the SQL
 *     and returns `totalBytesProcessed` **without running it or billing** —
 *     which is how a workflow checks the price before paying it.
 *
 * `useLegacySql` is forced to `false`: standard SQL is the current dialect, and
 * legacy SQL silently changes the meaning of a query rather than failing.
 */
const action: ActionDefinition = {
  key: "query-run",
  type: "read",
  resource: "query",
  title: "Run a query",
  description: "Run standard SQL and return the rows.",
  params: [
    PROJECT_PARAM,
    {
      key: "query",
      label: "SQL",
      type: "code",
      required: true,
      default: "",
      placeholder: "SELECT name, count FROM `project.dataset.table` LIMIT 100",
    },
    {
      key: "maxResults",
      label: "Max Rows",
      type: "number",
      default: 1000,
      hint: "Rows in this response. Use the page token for more.",
    },
    {
      key: "timeoutMs",
      label: "Timeout (ms)",
      type: "number",
      default: 30000,
      hint: "How long to wait for a reply — NOT a query cancellation. On timeout you get a " +
        "job reference and `jobComplete: false`.",
    },
    {
      key: "dryRun",
      label: "Dry Run",
      type: "boolean",
      default: false,
      hint: "Validate and price the query without running it. Nothing is billed.",
    },
    {
      key: "queryParameters",
      label: "Query Parameters",
      type: "json",
      default: "",
      placeholder: '[{"name":"since","parameterType":{"type":"TIMESTAMP"},' +
        '"parameterValue":{"value":"2026-01-01 00:00:00"}}]',
      hint: "Named parameters — the safe way to interpolate values into SQL.",
    },
    {
      key: "parameterMode",
      label: "Parameter Mode",
      type: "select",
      default: "NAMED",
      options: [
        { value: "NAMED", label: "Named (@name)" },
        { value: "POSITIONAL", label: "Positional (?)" },
      ],
    },
    {
      key: "defaultDatasetId",
      label: "Default Dataset",
      type: "string",
      default: "",
      hint: "Lets the SQL use unqualified table names.",
    },
    {
      key: "maximumBytesBilled",
      label: "Maximum Bytes Billed",
      type: "string",
      default: "",
      hint: "A hard cost ceiling — BigQuery fails the query rather than exceeding it.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
      placeholder: "EU",
      hint: "Required when the dataset is not in the multi-region BigQuery infers.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "Decoded rows" },
    { key: "schema", type: "object", label: "Result schema" },
    { key: "jobComplete", type: "boolean", label: "Did the query finish?" },
    { key: "jobReference", type: "object", label: "Job reference — use it if not complete" },
    { key: "totalRows", type: "string", label: "Total rows" },
    { key: "totalBytesProcessed", type: "string", label: "Bytes processed (what you pay for)" },
    { key: "cacheHit", type: "boolean", label: "Served from cache" },
    { key: "pageToken", type: "string", label: "Next page token" },
    { key: "errors", type: "array", label: "Errors" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const sql = String(p.query ?? "").trim();
    if (!sql) throw new Error("`query` is required");

    const defaultDataset = String(p.defaultDatasetId ?? "").trim();
    const body = compact({
      query: sql,
      // Standard SQL. Legacy SQL changes what a query means rather than
      // failing, so it is never silently enabled.
      useLegacySql: false,
      maxResults: typeof p.maxResults === "number" ? p.maxResults : undefined,
      timeoutMs: typeof p.timeoutMs === "number" ? p.timeoutMs : undefined,
      dryRun: p.dryRun === true ? true : undefined,
      queryParameters: json(p.queryParameters, "queryParameters"),
      parameterMode: p.parameterMode,
      defaultDataset: defaultDataset
        ? { projectId: project, datasetId: defaultDataset }
        : undefined,
      maximumBytesBilled: p.maximumBytesBilled,
      location: p.location,
    });

    ctx.log("info", "running BigQuery query", { project, dryRun: p.dryRun === true });

    const res = await new BigQueryClient(ctx).request<{
      schema?: { fields?: Array<{ name?: string }> };
      rows?: Array<{ f?: Array<{ v?: unknown }> }>;
    }>(`/projects/${encodeURIComponent(project)}/queries`, { method: "POST", body });

    // The raw response is returned untouched; `rows` is replaced with the
    // decoded form because that is what a workflow actually consumes.
    const decoded = decodeRows(res?.schema, res?.rows);
    return decoded ? { ...res, rows: decoded, rawRows: res.rows } : res;
  },
};

export default action;
