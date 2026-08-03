import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  records: Array<{ id: number; fields: Record<string, unknown> }>;
  noparse?: boolean;
}

/**
 * `PATCH /docs/{docId}/tables/{tableId}/records`.
 *
 * Every element needs an `id` — this endpoint never creates. It is a genuine
 * PATCH: only the columns named in `fields` are touched, so omitting a column
 * leaves it alone rather than clearing it. To clear one, send `null`.
 *
 * The API returns **no body** on success. `execute` therefore returns the ids it
 * asked Grist to change, so a downstream step has something to key on instead of
 * `undefined`.
 */
const updateRecords: ActionDefinition<Input, { records: Array<{ id: number }> }> = {
  key: "update-records",
  type: "perform",
  resource: "record",
  title: "Update Records",
  description:
    "Patch existing records by row ID. Only the columns you name are changed; send null to clear one.",
  // Applying the same patch twice reaches the same state.
  idempotent: true,
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    { key: "tableId", label: "Table ID", type: "string", required: true },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: 'Array of {"id": 1, "fields": {colId: value}}. The numeric row ID, as returned by ' +
        "`list-records` — not a value from any column.",
    },
    {
      key: "noparse",
      label: "Do not parse strings",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "On, values are stored verbatim rather than coerced to the column type.",
    },
  ],
  output: [
    { key: "records", type: "array", label: "Updated record ids" },
  ],

  async execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    const records = input.records ?? [];
    await client.request(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/records`,
      {
        method: "PATCH",
        query: { noparse: input.noparse },
        body: { records },
      },
    );
    // Grist answers 200 with an empty body — echo the ids so the step has output.
    return { records: records.map((r) => ({ id: r.id })) };
  },
};

export default updateRecords;
