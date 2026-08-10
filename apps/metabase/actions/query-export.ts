import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, MetabaseClient } from "../lib/client.ts";
import { exportFormatOptions } from "../lib/params.ts";

/**
 * `POST /api/dataset/{export-format}` — run an ad-hoc query and return the
 * result as a file.
 *
 * The same relationship to `query-run` that `question-export` has to
 * `question-run`: unconstrained rows, a 200 instead of a 202, and a file body
 * with no query-result envelope to inspect. The reasoning is written out once,
 * on `question-export`.
 *
 * ## The body shape differs from `POST /api/dataset`, which is easy to miss
 *
 * The plain endpoint takes the query at the **top level**:
 *
 *     POST /api/dataset
 *     { "database": 1, "type": "native", "native": { "query": "SELECT 1" } }
 *
 * The export endpoint takes it **nested under `query`**, and the OpenAPI
 * document is explicit that this is the one required member:
 *
 *     POST /api/dataset/csv
 *     { "query": { "database": 1, "type": "native", "native": {"query":"SELECT 1"} } }
 *
 * Sending the flat shape to the export path produces an unhelpful error rather
 * than a result. Verified live: the nested form returned `200 text/csv` with
 * `a\n1\n` for `SELECT 1 AS a`. This action builds the nesting, so a caller
 * supplies the same `database` / `type` / `query` triple as `query-run` and does
 * not have to know the difference.
 */
interface Input {
  database: number;
  type?: string;
  query: unknown;
  format?: string;
  parameters?: unknown;
  formatRows?: boolean;
}

const queryExport: ActionDefinition<Input> = {
  key: "query-export",
  type: "read",
  resource: "query",
  title: "Export Query",
  description:
    "Run an ad-hoc native SQL or MBQL query and return the full result set as CSV, JSON or " +
    "XLSX. Unlike Run Query this is not row-capped.",
  params: [
    {
      key: "database",
      label: "Database ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "type",
      label: "Query language",
      type: "select",
      required: true,
      default: "native",
      options: [
        { value: "native", label: "Native SQL" },
        { value: "query", label: "MBQL" },
      ],
    },
    {
      key: "query",
      label: "Query",
      type: "json",
      required: true,
      hint: 'Native: `{"query": "SELECT * FROM orders"}`. MBQL: `{"source-table": 2}`.',
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      required: true,
      default: "csv",
      options: exportFormatOptions,
      hint:
        "`json` returns row OBJECTS keyed by column name. `xlsx` is binary and is returned as " +
        "text here, which mangles it.",
    },
    {
      key: "parameters",
      label: "Parameters",
      type: "json",
      hint: "JSON array of Metabase parameter objects, for a native query using template tags.",
    },
    {
      key: "formatRows",
      label: "Apply column formatting",
      type: "boolean",
      default: false,
      hint: "Render values with display formatting instead of raw values.",
    },
  ],
  output: [
    { key: "format", type: "string", label: "Format requested" },
    { key: "content", type: "string", label: "Exported result" },
  ],

  async execute(input, ctx) {
    const type = input.type ?? "native";
    const format = input.format ?? "csv";
    const query = asJson<Record<string, unknown>>(input.query, "Query");

    const content = await new MetabaseClient(ctx).requestText(
      `/api/dataset/${encodeURIComponent(format)}`,
      {
        method: "POST",
        body: {
          // Note the nesting: this endpoint wants the whole query under `query`,
          // unlike POST /api/dataset which takes it flat. See the file comment.
          query: {
            database: input.database,
            type,
            [type === "native" ? "native" : "query"]: query,
            parameters: asOptionalJson<unknown[]>(input.parameters, "Parameters"),
          },
          format_rows: input.formatRows ?? false,
        },
      },
    );
    return { format, content };
  },
};

export default queryExport;
