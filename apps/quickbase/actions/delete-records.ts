import type { ActionDefinition } from "@w6w/types";
import { parseJsonOptional, QuickbaseClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  where?: string;
  recordIds?: unknown;
}

interface Output {
  numberDeleted?: number;
}

/**
 * `DELETE /records` — delete by query, with the filter in the request **body**.
 *
 * Both `from` and `where` are required by the spec; there is no "delete this one
 * record ID" path. To delete a single record, filter on it:
 * `{3.EX.'42'}`, or pass `[42]` as Record IDs.
 *
 * ## Why this action refuses an empty filter
 *
 * Quickbase's own documentation spells out how to empty a table: *"To delete all
 * records specify a filter that will include all records, for example {3.GT.0}
 * where 3 is the ID of the Record ID field."* That is a legitimate operation and
 * it stays available — but it has to be **asked for**, not arrived at.
 *
 * The failure this guards against is a workflow whose filter is interpolated
 * from an upstream step. When that step yields nothing, the filter renders
 * empty, and an empty filter forwarded verbatim is the difference between
 * deleting nothing and deleting the table. So a blank `where` with no record IDs
 * is rejected here rather than sent. Spelling `{3.GT.0}` is a deliberate act;
 * an empty template variable is an accident.
 *
 * `idempotent: false`: re-running a delete against a filter that now matches
 * different rows is not the same operation twice.
 */
const deleteRecords: ActionDefinition<Input, Output> = {
  key: "delete-records",
  type: "perform",
  resource: "record",
  title: "Delete Records",
  // `false`: the filter is evaluated fresh on every call, so a replay deletes
  // whatever matches *now* — not the rows the first call matched. Deleting an
  // explicit record-id list would converge, but the filter arm is the worst
  // case and it is the one that governs.
  idempotent: false,
  description:
    "Delete records matching a Quickbase query, or a list of record IDs. Requires an explicit filter.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "where",
      label: "Where (Quickbase query language)",
      type: "string",
      placeholder: "{6.EX.'obsolete'}",
      hint:
        "Operators must be UPPERCASE. To delete every record, say so explicitly with {3.GT.0} — an empty filter is rejected.",
    },
    {
      key: "recordIds",
      label: "Record IDs",
      type: "json",
      hint: "Array of record IDs to delete instead of a Where clause, e.g. [12, 13].",
    },
  ],
  output: [{ key: "numberDeleted", type: "number", label: "Records deleted" }],

  execute(input, ctx) {
    const where = input.where?.trim()
      ? input.where.trim()
      : parseJsonOptional<number[]>(input.recordIds, "Record IDs");

    if (where === undefined || (Array.isArray(where) && where.length === 0)) {
      throw new Error(
        "Refusing to delete with an empty filter. Provide a Where clause or record IDs; " +
          "to delete every record in the table, pass the explicit filter {3.GT.0}.",
      );
    }

    return new QuickbaseClient(ctx).request<Output>("records", {
      method: "DELETE",
      body: { from: input.tableId, where },
    });
  },
};

export default deleteRecords;
