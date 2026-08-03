import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, MetabaseClient } from "../lib/client.ts";
import { exportFormatOptions, queryParametersParam } from "../lib/params.ts";

/**
 * `POST /api/card/{card-id}/query/{export-format}` — run a saved question and
 * return the result as a file.
 *
 * ## Why this is a separate action and not a `format` flag on `question-run`
 *
 * Three things differ, and all three are visible to the caller:
 *
 * 1. **The row ceiling is gone.** `qpapi.clj` applies
 *    `default-query-constraints` only when the export format is `:api` — the
 *    JSON API shape. Ask for `csv`, `json` or `xlsx` and the query runs
 *    unconstrained, so this is the action to reach for when 2,000 rows is not
 *    enough. Measured on one question on v0.63.2.7: `/query` returned **2,000**
 *    rows, `/query/csv` returned **18,760**. (Which also means it is the action
 *    that can pull a million rows into a workflow step. The hint says so.)
 * 2. **The status code differs.** The export paths answer **200**, where the
 *    JSON API path answers **202**. Verified live on v0.63.2.7 for all four
 *    combinations. The client compares against neither.
 * 3. **The body is not a query-result envelope.** There is no `status` field to
 *    check, so `runQuery`'s body-level failure detection does not apply and this
 *    action deliberately does not use it. On a query error the streaming
 *    response either sets a 4xx/5xx before committing — which the client
 *    rejects — or aborts the connection mid-stream, which surfaces as a
 *    transport error. What cannot happen is a silent `status: "failed"` hiding
 *    in a 200 body, because these formats have no such field.
 *
 * ## The shapes, verified live
 *
 *   | Format | Content-Type       | Body for `SELECT 1 AS one, 2 AS two`     |
 *   | ------ | ------------------ | ---------------------------------------- |
 *   | `csv`  | `text/csv`         | `one,two\n1,2\n`                         |
 *   | `json` | `application/json` | `[{"one":1,"two":2}]`                    |
 *   | `xlsx` | spreadsheet binary | (binary)                                 |
 *
 * `json` is the interesting one: it is the **only** path where Metabase zips
 * columns onto values for you and returns row *objects*. `question-run` returns
 * positional arrays. A workflow that wants `{column: value}` records without
 * doing its own zipping should use this action with `format: "json"`.
 *
 * One thing the exports do that the JSON API path does not: they key on the
 * question's **display names**, not the raw column names. Verified on a sample
 * question, the CSV header row was `ID,User ID,Product ID,Subtotal ($),Tax ($),…`
 * — spaces, currency suffixes and all — and foreign keys were rendered as their
 * remapped labels (`Hudson Borer`, not the numeric user id). That is the right
 * shape for a spreadsheet a human will open and the wrong shape for a
 * downstream join, which is a reason to prefer `question-run` when the consumer
 * is another workflow step.
 *
 * `formatRows` is a *further* transformation on top of that, and it is off by
 * default. Verified: `SELECT 1234.5 AS n` exports as `1234.5` with it off and as
 * the string `"1,234.5"` with it on. Formatted numbers are strings and break
 * arithmetic downstream.
 *
 * ## `xlsx` and this action's return type
 *
 * The result is returned as text. That is correct for `csv` and `json` and
 * lossy for `xlsx`, which is a binary ZIP container: reading it as UTF-8 text
 * mangles it. `xlsx` is still offered because a workflow can legitimately want
 * to hand the bytes straight to something that only accepts a spreadsheet, but
 * the hint is explicit that it is not usable as text here. Returning it properly
 * needs a binary/attachment channel the action contract does not currently
 * have — noted rather than papered over.
 */
interface Input {
  cardId: number;
  format?: string;
  parameters?: unknown;
  formatRows?: boolean;
}

const questionExport: ActionDefinition<Input> = {
  key: "question-export",
  type: "read",
  resource: "question",
  title: "Export Question",
  description:
    "Run a saved question and return the full result set as CSV, JSON or XLSX. Unlike Run " +
    "Question this is not row-capped.",
  params: [
    {
      key: "cardId",
      label: "Question ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      required: true,
      default: "csv",
      options: exportFormatOptions,
      hint: "`json` is the only format that returns row OBJECTS keyed by column name. `xlsx` is " +
        "binary and is returned as text here, which mangles it — prefer csv or json unless " +
        "something downstream truly needs a workbook.",
    },
    queryParametersParam,
    {
      key: "formatRows",
      label: "Apply column formatting",
      type: "boolean",
      default: false,
      hint:
        "Render values using the question's display formatting (currency symbols, date formats, " +
        "thousands separators) instead of raw values. Off by default, matching the endpoint's " +
        "own default — formatted numbers are strings and break arithmetic downstream.",
    },
  ],
  output: [
    { key: "format", type: "string", label: "Format requested" },
    { key: "content", type: "string", label: "Exported result" },
  ],

  async execute(input, ctx) {
    const format = input.format ?? "csv";
    const content = await new MetabaseClient(ctx).requestText(
      `/api/card/${encodeURIComponent(String(input.cardId))}/query/${encodeURIComponent(format)}`,
      {
        method: "POST",
        body: {
          parameters: asOptionalJson<unknown[]>(input.parameters, "Parameters"),
          format_rows: input.formatRows ?? false,
        },
      },
    );
    return { format, content };
  },
};

export default questionExport;
