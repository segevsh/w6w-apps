import type { ActionDefinition } from "@w6w/types";
import { csv, NocoDBClient, query } from "../lib/client.ts";

/**
 * `GET /api/v2/tables/{tableId}/links/{linkFieldId}/records/{recordId}` — the
 * records on the other end of a link.
 *
 * ## Links are a separate endpoint, and that is the thing to know
 *
 * A linked-record field does **not** come back with the record. `record-get`
 * on an order returns the order; the line items live behind this call, keyed
 * by the link *field's* id rather than its name.
 *
 * A workflow written against a spreadsheet mental model expects the related
 * rows to be in the row. They are not, and the field's absence from the
 * response looks like the link being empty.
 *
 * ## The field id, not the field name
 *
 * `table-get` reports both. The id is stable across renames; the name is what
 * everybody has to hand, which is why this action's error names the source.
 *
 * ## This is the N+1 that eats a rate limit
 *
 * Sixty requests a minute, and one request per record per link field. Reading
 * the links of a hundred orders is a hundred requests — nearly two minutes of
 * budget. Where the relationship allows it, filtering the *child* table by its
 * parent id in one `record-list` call is a single request instead.
 */
const action: ActionDefinition = {
  key: "link-list",
  type: "read",
  resource: "link",
  title: "List linked records",
  description:
    "The records on the other end of a link — which do NOT come back with the parent record, so " +
    "their absence looks like an empty link. One request per record per field, against a budget " +
    "of 60 a minute, so filtering the child table is often cheaper.",
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "linkFieldId",
      label: "Link field ID",
      type: "string",
      required: true,
      default: "",
      hint: "The field's ID, not its name — `table-get` reports both.",
    },
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      default: "",
      hint: "The record whose links to read.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated, from the LINKED table.",
    },
    { key: "limit", label: "Page size", type: "number", default: 200 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "records", type: "array", label: "The linked records" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "totalRows", type: "number", label: "How many are linked in all" },
    { key: "ids", type: "array", label: "Their primary keys" },
    { key: "isEmpty", type: "boolean", label: "Whether nothing is linked" },
    { key: "requestsRemaining", type: "number", label: "Left in this minute's budget" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");
    const linkFieldId = String(p.linkFieldId ?? "").trim();
    if (!linkFieldId) {
      throw new Error(
        "`linkFieldId` is required — and it is the link field's ID rather than its name, which " +
          "`table-get` reports alongside the names",
      );
    }
    const recordId = String(p.recordId ?? "").trim();
    if (!recordId) throw new Error("`recordId` is required");

    const result = await new NocoDBClient(ctx).full<{
      list?: Array<Record<string, unknown>>;
      pageInfo?: { totalRows?: number };
    }>(
      `/api/v2/tables/${encodeURIComponent(tableId)}/links/${
        encodeURIComponent(linkFieldId)
      }/records/${encodeURIComponent(recordId)}`,
      {
        query: query({
          fields: csv(p.fields)?.join(","),
          limit: Math.max(1, Math.min(1000, Number(p.limit ?? 200))),
          offset: Math.max(0, Number(p.offset ?? 0)),
        }),
      },
    );

    const records = result.data?.list ?? [];

    return {
      records,
      count: records.length,
      totalRows: result.data?.pageInfo?.totalRows,
      ids: records.map((record) => record?.Id ?? record?.id).filter((id) => id !== undefined),
      isEmpty: records.length === 0,
      requestsRemaining: result.rateLimit.remaining,
    };
  },
};

export default action;
