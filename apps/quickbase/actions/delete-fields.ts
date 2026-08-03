import type { ActionDefinition } from "@w6w/types";
import { parseJson, QuickbaseClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  fieldIds: unknown;
}

interface Output {
  deletedFieldIds?: number[];
  errors?: string[];
}

/**
 * `DELETE /fields?tableId=…` with the ID list in the **body**.
 *
 * Note the asymmetry with the rest of the field routes: there is no
 * `DELETE /fields/{fieldId}`. Deletion is always a batch, addressed by a
 * `fieldIds` array in the request body — which is why this action is plural.
 *
 * ## Partial success again, in a different shape
 *
 * Like `upsert-records`, this endpoint can half-succeed — but it reports it
 * differently. There is no 207 here: a 200 carries both `deletedFieldIds` and
 * an `errors` array of per-field messages ("Error found with fid: 7"), so some
 * fields can survive a call that returned OK. `errors` is surfaced as a
 * first-class output for exactly that reason; check it rather than assuming a
 * 200 removed everything you named.
 *
 * Deleting a field deletes its data in every record. There is no undo.
 */
const deleteFields: ActionDefinition<Input, Output> = {
  key: "delete-fields",
  type: "perform",
  resource: "field",
  title: "Delete Fields",
  // `true`: the ids are explicit, so deletion converges. A replay reports the
  // already-gone ids in `errors` rather than removing anything further.
  idempotent: true,
  description:
    "Delete one or more fields from a table, with their data. Check `errors` — a 200 can still leave some fields undeleted.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "fieldIds",
      label: "Field IDs",
      type: "json",
      required: true,
      hint: "Array of field IDs to delete, e.g. [6, 7].",
    },
  ],
  output: [
    { key: "deletedFieldIds", type: "array", label: "Deleted field IDs" },
    { key: "errors", type: "array", label: "Per-field errors" },
  ],

  async execute(input, ctx) {
    const fieldIds = parseJson<number[]>(input.fieldIds, "Field IDs");
    if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
      throw new Error("Field IDs must be a non-empty array, e.g. [6, 7].");
    }

    const result = await new QuickbaseClient(ctx).request<Output>("fields", {
      method: "DELETE",
      query: { tableId: input.tableId },
      body: { fieldIds },
    });

    if (result.errors?.length) {
      ctx.log("warn", `Quickbase could not delete ${result.errors.length} of the fields named.`, {
        errors: result.errors,
      });
    }
    return result;
  },
};

export default deleteFields;
