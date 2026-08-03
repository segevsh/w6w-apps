import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  format?: "csv" | "tsv";
  header?: "colId" | "label";
}

/**
 * `GET /docs/{docId}/download/csv` (or `/tsv`).
 *
 * The one endpoint in this app that does **not** answer JSON — it returns
 * `text/csv` / `text/tab-separated-values` as a body, which is why the client
 * has a separate `requestText` path. Running it through the JSON path would
 * throw on `JSON.parse` for a call that actually succeeded.
 *
 * Why this exists beside `list-records`: a CSV is what you hand to something
 * that wants a file — an email attachment, an S3 put, a `POST` to a system that
 * ingests spreadsheets. Reformatting `list-records`' `{id, fields}` shape into
 * CSV in a workflow means re-deriving the column order and quoting rules that
 * Grist already applies here.
 *
 * `header` picks which name lands in row 1: `colId` (the normalized id, stable,
 * what every other endpoint uses) or `label` (the human name, which changes when
 * someone renames a column). Neither is a safe default for both audiences, so it
 * is an explicit choice with Grist's own framing in the hint.
 *
 * `dsv` is deliberately not offered. Grist documents it as "a custom delimiter"
 * and its own spec gives the example delimiter as 💩; there is no parameter to
 * choose one, so it is not a format anyone can usefully consume.
 */
const downloadTable: ActionDefinition<Input, { format: string; content: string }> = {
  key: "download-table",
  type: "read",
  resource: "table",
  title: "Download Table as CSV/TSV",
  description:
    "Export one table as delimited text, exactly as Grist's own export produces it. Returns the file body as a string.",
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "Required by this endpoint — there is no whole-document CSV.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "csv",
      options: [
        { value: "csv", label: "CSV — comma-separated" },
        { value: "tsv", label: "TSV — tab-separated" },
      ],
    },
    {
      key: "header",
      label: "Header row",
      type: "select",
      default: "colId",
      options: [
        { value: "colId", label: "colId — normalized IDs, stable across renames" },
        { value: "label", label: "label — human names, friendlier but not stable" },
      ],
      hint: "Grist's framing: labels are more human-friendly, colIds are more normalized.",
    },
  ],
  output: [
    { key: "format", type: "string", label: "Format returned" },
    { key: "content", type: "string", label: "File body" },
  ],

  async execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    const format = input.format ?? "csv";
    const content = await client.requestText(
      `/docs/${encodeURIComponent(input.docId)}/download/${format}`,
      { query: { tableId: input.tableId, header: input.header ?? "colId" } },
    );
    return { format, content };
  },
};

export default downloadTable;
