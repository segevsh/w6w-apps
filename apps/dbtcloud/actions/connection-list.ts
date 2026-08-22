import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v3/accounts/{account}/connections/` — the warehouses dbt builds
 * into.
 *
 * A "connection" here is a data warehouse — Snowflake, BigQuery, Databricks,
 * Redshift, Postgres — not an authentication link. It carries the account,
 * database and warehouse names, which is the answer to "where did this table
 * actually get written".
 *
 * dbt returns these without the credentials: the connection holds the *shape*
 * of the warehouse and per-user or per-environment credentials live separately,
 * so this is safe to read into a workflow that maps projects to warehouses.
 */
const action: ActionDefinition = {
  key: "connection-list",
  type: "read",
  resource: "connection",
  title: "List warehouse connections",
  description:
    "The data warehouses this account builds into — Snowflake, BigQuery, Databricks and so on. " +
    "The connection carries the warehouse's shape, not its credentials.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      default: "",
      hint: "Blank lists every connection in the account.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "connections", type: "array", label: "Warehouse connections" },
    { key: "count", type: "number", label: "Connections returned" },
    { key: "totalCount", type: "number", label: "Connections in scope" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const projectId = String(p.projectId ?? "").trim();

    const path = projectId
      ? `/api/v3/accounts/${client.accountId}/projects/${
        encodeURIComponent(projectId)
      }/connections/`
      : `/api/v3/accounts/${client.accountId}/connections/`;

    const { items, totalCount } = await client.requestAll(path, { query: query({}) }, want);
    return { connections: items, count: items.length, totalCount };
  },
};

export default action;
