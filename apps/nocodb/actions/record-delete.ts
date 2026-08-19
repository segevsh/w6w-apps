import type { ActionDefinition } from "@w6w/types";
import { json, NocoDBClient } from "../lib/client.ts";

/**
 * `DELETE /api/v2/tables/{tableId}/records` — remove rows.
 *
 * ## Ids in the body, and no filter
 *
 * NocoDB will not delete by condition here: the payload is a list of record
 * identifiers. That is a good constraint — a delete-by-filter that matches
 * everything is how tables get emptied — and it means a workflow deleting
 * "everything older than a year" has to *list* those records first and decide
 * on the ids it got.
 *
 * This action does the second half of that safely: it takes ids, refuses an
 * empty list, and reports how many it was given.
 *
 * ## Rows are gone, and the base's trash is not the API's
 *
 * NocoDB's interface has an undo history for a session; the API has nothing.
 * A deleted record is deleted, and if the base is backed by an external
 * database the row is gone from that database too.
 *
 * ## Links break quietly
 *
 * A record linked from another table leaves the link behind, pointing at
 * nothing. The linked-record cell renders as empty rather than as an error, so
 * a deletion shows up as missing data in a table nobody was looking at.
 */
const action: ActionDefinition = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete records",
  description:
    "Remove rows by id — NocoDB deliberately offers no delete-by-filter here, so a workflow has " +
    "to list first and decide. Deletion is final: the interface's undo is a session thing, and " +
    "an external-database base loses the row too.",
  idempotent: true,
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "recordIds",
      label: "Record IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "1, 2, 3",
      hint: "Comma-separated primary keys. There is no way to delete by condition.",
    },
    {
      key: "idField",
      label: "Primary key column",
      type: "string",
      default: "Id",
      advanced: true,
    },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "Deletion is final, and a record linked from another table leaves an empty link " +
        "rather than an error.",
    },
  ],
  output: [
    { key: "deleted", type: "number", label: "How many ids were sent" },
    { key: "ids", type: "array", label: "Which ones" },
    { key: "response", type: "array", label: "What NocoDB returned" },
    { key: "requestsRemaining", type: "number", label: "Left in this minute's budget" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");
    const idField = String(p.idField ?? "Id").trim() || "Id";

    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to delete these records. NocoDB's API has no undo — the interface's " +
          "history is a session feature — and a base backed by an external database loses the " +
          "rows from that database too",
      );
    }

    // Accept a comma-separated list or a JSON array of ids.
    const raw = p.recordIds;
    let ids: unknown[];
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      const parsed = json(raw, "recordIds");
      ids = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(raw)) {
      ids = raw;
    } else {
      ids = String(raw ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    }
    if (!ids.length) {
      throw new Error("`recordIds` must name at least one record — NocoDB has no delete-by-filter");
    }

    const result = await new NocoDBClient(ctx).full<
      Array<Record<string, unknown>> | Record<string, unknown>
    >(`/api/v2/tables/${encodeURIComponent(tableId)}/records`, {
      method: "DELETE",
      body: ids.map((id) => ({ [idField]: id })),
    });

    ctx.log(
      "warn",
      "deleted NocoDB records — any link from another table now points at nothing " +
        "and renders as an empty cell rather than an error",
      { tableId, count: ids.length },
    );

    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    return {
      deleted: ids.length,
      ids,
      response: rows,
      requestsRemaining: result.rateLimit.remaining,
    };
  },
};

export default action;
