import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  records: Array<{ require: Record<string, unknown>; fields?: Record<string, unknown> }>;
  onmany?: "first" | "none" | "all";
  noadd?: boolean;
  noupdate?: boolean;
  allowEmptyRequire?: boolean;
  noparse?: boolean;
}

/**
 * `PUT /docs/{docId}/tables/{tableId}/records`.
 *
 * The shape that trips people up: an element carries **`require`**, not `id`.
 * Grist looks for a record matching every column in `require`; if it finds one
 * it applies `fields` to it, and if it does not it creates a record from
 * `require` + `fields` merged, with `fields` winning on any column named twice.
 *
 * `allow_empty_require` is deliberately exposed and deliberately off. An empty
 * `require` matches **every row in the table**, which combined with
 * `onmany: "all"` rewrites the whole table in one call. Grist gates it behind
 * its own flag; so does this action, rather than letting `{}` slip through as a
 * plausible-looking no-op.
 */
const upsertRecords: ActionDefinition<Input, { records: Input["records"] }> = {
  key: "upsert-records",
  type: "perform",
  resource: "record",
  title: "Upsert Records",
  description:
    "Add or update records matched on column values rather than row ID. Creates when nothing matches.",
  // Re-running the same upsert converges on the same rows.
  idempotent: true,
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    { key: "tableId", label: "Table ID", type: "string", required: true },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint:
        'Array of {"require": {colId: value}, "fields": {colId: value}}. `require` is the match key ' +
        "(and seeds a newly created row); `fields` is what gets written.",
    },
    {
      key: "onmany",
      label: "When several records match",
      type: "select",
      default: "first",
      options: [
        { value: "first", label: "first — update the first match (Grist's default)" },
        { value: "none", label: "none — update nothing" },
        { value: "all", label: "all — update every match" },
      ],
    },
    {
      key: "noadd",
      label: "Never create",
      type: "boolean",
      default: false,
      hint: "Update-only: an unmatched record is skipped instead of inserted.",
    },
    {
      key: "noupdate",
      label: "Never update",
      type: "boolean",
      default: false,
      hint: "Insert-only: a matched record is left untouched.",
    },
    {
      key: "allowEmptyRequire",
      label: "Allow an empty match key",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "DANGEROUS. An empty `require` matches every row in the table; with `onmany: all` that " +
        "rewrites all of them. Off, Grist rejects the call.",
    },
    {
      key: "noparse",
      label: "Do not parse strings",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "records", type: "array", label: "Records submitted" },
  ],

  async execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    const records = input.records ?? [];
    await client.request(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/records`,
      {
        method: "PUT",
        query: {
          onmany: input.onmany,
          noadd: input.noadd,
          noupdate: input.noupdate,
          // Grist spells this one with underscores; the param is camelCase for
          // consistency with every other param in this pack.
          allow_empty_require: input.allowEmptyRequire,
          noparse: input.noparse,
        },
        body: { records },
      },
    );
    // Grist answers 200 with an empty body and does NOT report which rows it
    // touched — so there is no id to echo, only the request.
    return { records };
  },
};

export default upsertRecords;
