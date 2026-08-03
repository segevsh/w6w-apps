import type { ActionDefinition } from "@w6w/types";
import { AttioClient, OBJECT_PARAM } from "../lib/client.ts";

interface Input {
  object: string;
  recordId: string;
}

/**
 * `DELETE /v2/objects/{object}/records/{record_id}` — permanent.
 *
 * ## Deleting is not archiving, and Attio draws the line sharply
 *
 * From the Archiving vs deleting page, the distinction that matters before
 * anyone wires this into a workflow: archiving hides an entity while keeping its
 * data, and is reversible. Deleting is not. Records have no archive flag — only
 * attributes, select options and statuses do — so for a record this endpoint is
 * the only removal, and it is the irreversible one.
 *
 * ## The response is an empty object, not a 204
 *
 * The spec gives it `200` with the schema `{"type": "object", "properties": {}}`.
 * There is nothing to return and nothing to read; `deleted: true` below is this
 * action's own summary of a successful call, not a field Attio sent.
 *
 * ## A 404 can mean the record is mid-merge
 *
 * As with Get Record, `merge_in_progress` shares the 404 status with
 * `not_found`. The client names the code in the error message so "the merge has
 * not finished yet" does not read as "somebody already deleted it".
 */
const deleteRecord: ActionDefinition<Input> = {
  key: "delete-record",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  idempotent: true,
  description:
    "Permanently delete a record. **Not reversible and not archiving** — Attio has no archive " +
    "state for records, so the data is gone. A second call on the same id returns 404.",
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
      hint: "UUID of the record to delete. There is no undo.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when Attio accepted the delete" },
    { key: "record_id", type: "string", label: "The id that was deleted" },
  ],

  async execute(input, ctx) {
    await new AttioClient(ctx).request(
      `/objects/${encodeURIComponent(input.object)}/records/${encodeURIComponent(input.recordId)}`,
      { method: "DELETE" },
    );
    return { deleted: true, record_id: input.recordId };
  },
};

export default deleteRecord;
