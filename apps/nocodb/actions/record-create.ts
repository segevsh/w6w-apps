import type { ActionDefinition } from "@w6w/types";
import { json, NocoDBClient } from "../lib/client.ts";

/**
 * `POST /api/v2/tables/{tableId}/records` — insert rows.
 *
 * ## One endpoint, one record or a thousand
 *
 * The body is an object or an array of objects, and the array form is one
 * request rather than N. With sixty requests a minute that difference is the
 * whole feasibility of an import: a thousand records inserted one at a time is
 * seventeen minutes of waiting on the rate limit, and one array is a second.
 *
 * ## It returns the ids, and that is the only way to get them
 *
 * NocoDB generates the primary key. The response is the list of created ids,
 * in order — so a workflow that needs to link or update what it just created
 * has to keep them. Nothing else will hand them back.
 *
 * ## Unknown columns are rejected, and required ones are not enforced here
 *
 * A field name that does not exist in the table is an error. A column marked
 * required in the interface is a UI convention: the API accepts a row without
 * it, and the gap shows up in a view.
 */
const action: ActionDefinition = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create records",
  description:
    "Insert one row or many in a single request — which is the difference between an import " +
    "taking a second and seventeen minutes, at 60 requests a minute. Returns the generated " +
    "IDS IN ORDER, which is the only way to get them.",
  idempotent: false,
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"Title":"First","Status":"Active"}]',
      hint: "An object or an array of objects, keyed by COLUMN NAME. An unknown column is an " +
        "error; a column the interface marks required is not enforced here.",
    },
  ],
  output: [
    { key: "created", type: "array", label: "The created ids, in order" },
    { key: "count", type: "number", label: "How many rows were inserted" },
    { key: "ids", type: "array", label: "Just the primary keys" },
    { key: "columns", type: "array", label: "Which columns were written" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const parsed = json(p.records, "records");
    if (!parsed || typeof parsed !== "object") {
      throw new Error("`records` must be an object or an array of objects");
    }
    const records = (Array.isArray(parsed) ? parsed : [parsed]) as Array<Record<string, unknown>>;
    if (!records.length) throw new Error("`records` must contain at least one record");

    const invalid = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => !record || typeof record !== "object" || Array.isArray(record));
    if (invalid.length) {
      throw new Error(
        `every record must be an object — these are not: ${
          invalid.map(({ index }) => index).join(", ")
        }`,
      );
    }

    const created = await new NocoDBClient(ctx).request<
      Array<Record<string, unknown>> | Record<string, unknown>
    >(`/api/v2/tables/${encodeURIComponent(tableId)}/records`, {
      method: "POST",
      // The array form is one request; NocoDB accepts either.
      body: records.length === 1 ? records[0] : records,
    });

    const rows = Array.isArray(created) ? created : created ? [created] : [];
    const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];

    // Ids and column names. The values are the customer's data.
    ctx.log("info", "created NocoDB records", { tableId, count: rows.length });

    return {
      created: rows,
      count: rows.length,
      ids: rows.map((row) => row?.Id ?? row?.id).filter((id) => id !== undefined),
      columns,
    };
  },
};

export default action;
