import type { ActionDefinition } from "@w6w/types";
import { AttioClient, LIST_PARAM } from "../lib/client.ts";
import { ENTRY_VALUES_PARAM, entryValues, flattenValues } from "../lib/values.ts";

interface Input {
  list: string;
  parentObject: string;
  parentRecordId: string;
  entryValues?: unknown;
}

/**
 * `POST /v2/lists/{list}/entries` — add a record to a list.
 *
 * "Adds a record to a list as a new list entry. This endpoint will throw on
 * conflicts of unique attributes. **Multiple list entries are allowed for the
 * same parent record.**"
 *
 * That last clause is the one to read twice. Adding the same company to the same
 * list twice is not an error and not a no-op — it creates a second entry. A
 * workflow that runs on every inbound webhook and calls this action will
 * accumulate duplicates, quietly, at 201 apiece.
 *
 * **Upsert Entry is the idempotent counterpart** and is what a repeatable
 * workflow should call: it updates the existing entry for that parent record
 * instead of adding another. This action is for the case where two entries for
 * one record is genuinely what you mean.
 *
 * ## Three required fields, and the values are the list's own
 *
 *     { "data": { "parent_object": "people",
 *                 "parent_record_id": "891dcbfc-…",
 *                 "entry_values": { … } } }
 *
 * All three are `required` in the schema — including `entry_values`, which is
 * why an empty object is sent rather than the key being omitted when a list has
 * no attributes of its own to set.
 *
 * The keys inside `entry_values` are the **list's** attribute slugs, not the
 * object's. A Sales list's `stage` is an attribute of the list; the company's
 * `name` is not addressable here.
 */
const createEntry: ActionDefinition<Input> = {
  key: "create-entry",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  idempotent: false,
  description:
    "Add a record to a list as a new entry. **Not idempotent** — Attio explicitly allows several " +
    "entries for the same parent record, so calling this twice creates two entries. Use Upsert " +
    "Entry in anything that can run more than once.",
  params: [
    LIST_PARAM,
    {
      key: "parentObject",
      label: "Parent object",
      type: "string",
      required: true,
      placeholder: "people",
      hint: "Slug or UUID of the object the record being added belongs to.",
    },
    {
      key: "parentRecordId",
      label: "Parent record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
      hint: "UUID of the record to add. It becomes the entry's parent.",
    },
    { ...ENTRY_VALUES_PARAM, required: false },
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, list_id, entry_id)" },
    { key: "entry_values", type: "object", label: "The entry's values as stored" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
    { key: "created_at", type: "string", label: "Creation timestamp" },
  ],

  async execute(input, ctx) {
    const entry = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/lists/${encodeURIComponent(input.list)}/entries`,
      {
        method: "POST",
        body: entryValues(input.entryValues, {
          parent_object: input.parentObject,
          parent_record_id: input.parentRecordId,
        }),
      },
    );
    return { ...entry, values_flat: flattenValues(entry?.entry_values) };
  },
};

export default createEntry;
