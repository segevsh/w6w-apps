import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, MetabaseClient } from "../lib/client.ts";
import { queryResultOutput } from "../lib/params.ts";

/**
 * `POST /api/dataset` — run an ad-hoc query that is not saved as a question.
 *
 * Metabase takes two query languages here and this action takes both, because
 * they are the same endpoint with a different `type`:
 *
 *   - **native** — raw SQL (or the target driver's own language):
 *
 *         { "database": 1, "type": "native",
 *           "native": { "query": "SELECT count(*) FROM orders" } }
 *
 *   - **MBQL** — Metabase's structured query language, the thing the graphical
 *     query builder produces:
 *
 *         { "database": 1, "type": "query",
 *           "query": { "source-table": 2, "limit": 10 } }
 *
 * Both verified live against v0.63.2.7: 202, `status: "completed"`, correct row
 * counts. The easiest way to obtain a valid MBQL body is to build the question
 * in Metabase's UI and read `dataset_query` off it with `question-get`.
 *
 * ## Why the query is one `json` param and not a form
 *
 * MBQL is a recursive s-expression language — aggregations, breakouts, nested
 * joins, expression literals, field refs — and native queries carry
 * driver-specific template tags. Metabase's own OpenAPI document declines to
 * schematise the body at all: the request schema for this endpoint is
 * `{"database": {"oneOf": [{"type":"integer"},{"type":"null"}]}}` and nothing
 * else, with the entire query left unspecified. Generating a form from that
 * would mean inventing a schema the vendor deliberately does not publish, and it
 * would be wrong the first time someone used a feature it did not anticipate.
 *
 * So `database` and `type` are real params — they are simple, always required,
 * and getting them wrong is the commonest mistake — and the query body itself is
 * handed through as JSON.
 *
 * ## The row ceiling applies here too
 *
 * `POST /api/dataset` runs through `qp/userland-query-with-default-constraints`,
 * so the same 2,000 / 10,000 row truncation applies as for `question-run`. For a
 * native query this is easy to work around and easy to forget: put an explicit
 * `LIMIT`/`OFFSET` in the SQL, or use `query-export`, which is unconstrained.
 *
 * ## This action can read anything the key's group can read
 *
 * A native query is arbitrary SQL against a registered database, executed with
 * whatever the API key's group is permitted. That is the point of the action,
 * and it is also the reason the auth field's hint says to scope the key to the
 * narrowest group that can see the data. Metabase enforces this server-side —
 * verified: the caller's `permissions` object reports
 * `can_create_native_queries`, and a key whose group lacks native-query rights
 * is refused with a 403 that the client surfaces.
 */
interface Input {
  database: number;
  type?: string;
  query: unknown;
  parameters?: unknown;
}

const queryRun: ActionDefinition<Input> = {
  key: "query-run",
  type: "read",
  resource: "query",
  title: "Run Query",
  description:
    "Run an ad-hoc native SQL or MBQL query against a database registered in Metabase. " +
    "Truncated at 2,000 rows (10,000 if aggregated) — use Export Query for the full result set.",
  params: [
    {
      key: "database",
      label: "Database ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "From List Databases. Metabase's bundled sample database is usually 1.",
    },
    {
      key: "type",
      label: "Query language",
      type: "select",
      required: true,
      default: "native",
      options: [
        { value: "native", label: "Native SQL", description: "Raw SQL for the target driver." },
        {
          value: "query",
          label: "MBQL",
          description: "Metabase's structured query language, as the query builder emits it.",
        },
      ],
    },
    {
      key: "query",
      label: "Query",
      type: "json",
      required: true,
      hint: 'Native: `{"query": "SELECT count(*) FROM orders"}`. ' +
        'MBQL: `{"source-table": 2, "limit": 10}`. ' +
        "To get a valid MBQL body, build the question in Metabase and read its `dataset_query` " +
        "with Get Question.",
    },
    {
      key: "parameters",
      label: "Parameters",
      type: "json",
      hint: "JSON array of Metabase parameter objects, for a native query using template tags " +
        "(`{{tag}}`). Leave empty for a query with no tags.",
    },
  ],
  output: queryResultOutput,

  execute(input, ctx) {
    const type = input.type ?? "native";
    const query = asJson<Record<string, unknown>>(input.query, "Query");
    return new MetabaseClient(ctx).runQuery("/api/dataset", {
      body: {
        database: input.database,
        type,
        // Metabase keys the query body by its own language name: `native` for
        // SQL, `query` for MBQL. Sending the wrong key is a 400, not a silent
        // empty result, so this is worth getting right in one place.
        [type === "native" ? "native" : "query"]: query,
        parameters: asOptionalJson<unknown[]>(input.parameters, "Parameters"),
      },
    });
  },
};

export default queryRun;
