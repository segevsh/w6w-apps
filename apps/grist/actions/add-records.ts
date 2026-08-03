import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  records: Array<{ fields: Record<string, unknown> }> | Record<string, unknown>[];
  noparse?: boolean;
}

/** `POST .../records` answers with the new row ids and nothing else. */
interface Output {
  records: Array<{ id: number }>;
}

/**
 * `POST /docs/{docId}/tables/{tableId}/records`.
 *
 * Every element must be wrapped as `{ "fields": { … } }`. A bare
 * `{ "pet": "cat" }` is the single most likely mistake here, so `normalize`
 * accepts it and wraps it rather than letting Grist reject the batch — the
 * envelope carries no information a caller could get wrong, unlike `require`
 * on `upsert-records`, which genuinely means something different.
 */
const addRecords: ActionDefinition<Input, Output> = {
  key: "add-records",
  type: "perform",
  resource: "record",
  title: "Add Records",
  description: "Append one or more records to a table. Returns the new row IDs.",
  // Grist has no idempotency key on this endpoint: a retry appends duplicates.
  idempotent: false,
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    { key: "tableId", label: "Table ID", type: "string", required: true },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint:
        'Array of {"fields": {colId: value}}. A bare array of {colId: value} objects is accepted ' +
        "and wrapped for you. Column IDs, not labels.",
    },
    {
      key: "noparse",
      label: "Do not parse strings",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        'Off (the default), Grist parses a string against the column type — "1/2/2026" into a Date. ' +
        "On, an unparseable value is stored as-is and shown as invalid instead of raising an error.",
    },
  ],
  output: [
    { key: "records", type: "array", label: "Created records (ids only)" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<Output>(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/records`,
      {
        method: "POST",
        query: { noparse: input.noparse },
        body: { records: normalize(input.records) },
      },
    );
  },
};

/** Wrap any element that is not already `{ fields: … }`. */
export function normalize(
  records: Input["records"],
): Array<{ fields: Record<string, unknown> }> {
  return (records ?? []).map((r) => {
    const rec = r as Record<string, unknown>;
    if (rec && typeof rec === "object" && "fields" in rec) {
      return { fields: rec.fields as Record<string, unknown> };
    }
    return { fields: rec };
  });
}

export default addRecords;
