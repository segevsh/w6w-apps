import type { ActionDefinition } from "@w6w/types";
import { json, NocoDBClient } from "../lib/client.ts";

/**
 * `PATCH /api/v2/tables/{tableId}/records` — change rows.
 *
 * ## The id travels in the body, not the path
 *
 * Every record in the payload carries its own primary key, which is what makes
 * this a bulk endpoint: one request updates a hundred different rows. A record
 * without an id is not an insert — it is an error, and NocoDB's message names
 * the missing field rather than the rule, so this checks first.
 *
 * ## It is a PATCH, so absent fields are left alone
 *
 * This is the opposite of most of the write APIs in this pack: sending
 * `{Id: 5, Status: "Done"}` changes the status and touches nothing else. There
 * is no way to clear a field by omitting it — clearing means sending `null`.
 *
 * ## Nothing checks that the row is the one you read
 *
 * There is no version, no ETag, no conditional update. Two workflows updating
 * the same row race, and the last write wins silently. For a queue-shaped
 * table the usual answer is a status column and a filter that only picks up
 * rows in the state you expect.
 */
const action: ActionDefinition = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update records",
  description:
    "Change one row or many in one request — each carries its own primary key in the body. It " +
    "is a PATCH, so fields you omit are left alone and clearing one means sending `null`. There " +
    "is no conditional update, so concurrent writes race silently.",
  idempotent: true,
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"Id":1,"Status":"Done"}]',
      hint: "An object or an array, each carrying the table's primary key. Omitted fields are " +
        "left alone; send `null` to clear one.",
    },
    {
      key: "idField",
      label: "Primary key column",
      type: "string",
      default: "Id",
      advanced: true,
      hint: "NocoDB's default is `Id`. A base built on an existing database may use another.",
    },
  ],
  output: [
    { key: "updated", type: "array", label: "What NocoDB returned" },
    { key: "count", type: "number", label: "How many rows were addressed" },
    { key: "ids", type: "array", label: "Which rows" },
    { key: "columns", type: "array", label: "Which columns were written" },
    { key: "clearedFields", type: "array", label: "Fields explicitly set to null" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");
    const idField = String(p.idField ?? "Id").trim() || "Id";

    const parsed = json(p.records, "records");
    if (!parsed || typeof parsed !== "object") {
      throw new Error("`records` must be an object or an array of objects");
    }
    const records = (Array.isArray(parsed) ? parsed : [parsed]) as Array<Record<string, unknown>>;
    if (!records.length) throw new Error("`records` must contain at least one record");

    // A record without its id is an error NocoDB reports as a missing field.
    const missing = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => record?.[idField] === undefined);
    if (missing.length) {
      throw new Error(
        `every record must carry its \`${idField}\` — these do not: ${
          missing.map(({ index }) => index).join(", ")
        }. An update with no id is not an insert; use \`record-create\` for that`,
      );
    }

    const updated = await new NocoDBClient(ctx).request<
      Array<Record<string, unknown>> | Record<string, unknown>
    >(`/api/v2/tables/${encodeURIComponent(tableId)}/records`, {
      method: "PATCH",
      body: records.length === 1 ? records[0] : records,
    });

    const rows = Array.isArray(updated) ? updated : updated ? [updated] : [];
    const columns = [
      ...new Set(records.flatMap((record) => Object.keys(record).filter((k) => k !== idField))),
    ];
    const clearedFields = [
      ...new Set(
        records.flatMap((record) =>
          Object.entries(record).filter(([, value]) => value === null).map(([key]) => key)
        ),
      ),
    ];

    ctx.log("info", "updated NocoDB records", { tableId, count: records.length });

    return {
      updated: rows,
      count: records.length,
      ids: records.map((record) => record[idField]),
      columns,
      clearedFields,
    };
  },
};

export default action;
