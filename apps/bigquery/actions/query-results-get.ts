import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, decodeRows, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectId}/queries/{jobId}` — verified against BigQuery's
 * discovery document (`jobs.getQueryResults`).
 *
 * The other half of `query-run`: when a query does not finish inside its
 * timeout, or was started as a job, this fetches its rows. It also pages —
 * `query-run` returns the first page and a `pageToken`, and this reads the
 * rest.
 *
 * **`location` matters here.** BigQuery jobs are regional, and fetching results
 * for a job in, say, the EU without naming the location returns "not found"
 * rather than a helpful error. `query-run`'s response carries the location it
 * used.
 */
const action: ActionDefinition = {
  key: "query-results-get",
  type: "read",
  resource: "query",
  title: "Get query results",
  description: "Fetch the rows of a query job, including further pages.",
  params: [
    PROJECT_PARAM,
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `jobReference.jobId` on a query that did not complete in time.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
      hint: "The job's region. Omitting it for a non-default region returns not-found.",
    },
    { key: "pageToken", label: "Page Token", type: "string", default: "" },
    { key: "maxResults", label: "Max Rows", type: "number", default: 1000 },
    {
      key: "startIndex",
      label: "Start Index",
      type: "string",
      default: "",
      hint: "Zero-based row offset, as an alternative to a page token.",
    },
    {
      key: "timeoutMs",
      label: "Timeout (ms)",
      type: "number",
      default: null,
      hint: "How long to wait for the job to finish before replying.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "Decoded rows" },
    { key: "schema", type: "object", label: "Result schema" },
    { key: "jobComplete", type: "boolean", label: "Did the job finish?" },
    { key: "totalRows", type: "string", label: "Total rows" },
    { key: "pageToken", type: "string", label: "Next page token" },
    { key: "errors", type: "array", label: "Errors" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");

    ctx.log("info", "getting BigQuery query results", { project, jobId });

    const res = await new BigQueryClient(ctx).request<{
      schema?: { fields?: Array<{ name?: string }> };
      rows?: Array<{ f?: Array<{ v?: unknown }> }>;
    }>(
      `/projects/${encodeURIComponent(project)}/queries/${encodeURIComponent(jobId)}`,
      {
        query: {
          location: (p.location as string) || undefined,
          pageToken: (p.pageToken as string) || undefined,
          maxResults: typeof p.maxResults === "number" ? p.maxResults : undefined,
          startIndex: (p.startIndex as string) || undefined,
          timeoutMs: typeof p.timeoutMs === "number" ? p.timeoutMs : undefined,
        },
      },
    );

    const decoded = decodeRows(res?.schema, res?.rows);
    return decoded ? { ...res, rows: decoded, rawRows: res.rows } : res;
  },
};

export default action;
