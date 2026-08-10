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
 * `PUT /v2/lists/{list}/entries` — create or update the entry for a given parent
 * record. The idempotent way to put a record on a list.
 *
 * ## What it matches on, and how it refuses to guess
 *
 * Verbatim: "If an entry with the specified parent record is found, that entry
 * will be updated. If no such entry is found, a new entry will be created
 * instead. If there are multiple entries with the same parent record, this
 * endpoint with return the `MULTIPLE_MATCH_RESULTS` error."
 *
 * The matching key is the **parent record**, not a unique attribute — unlike
 * Upsert Record, there is no `matching_attribute` parameter here. That is
 * exactly why the error exists: Create Entry deliberately allows a record to
 * appear on the same list more than once, and once it does, "the entry for this
 * record" no longer identifies one row. The client's error message names the
 * code and what to do about it.
 *
 * ## Multiselect handling is fixed, and it is overwrite
 *
 * There is no append mode on this endpoint and no verb to choose: "When writing
 * to multi-select attributes, all values will be either created or deleted as
 * necessary to match the list of values supplied in the request body." Whatever
 * you send becomes the complete set. That is stated on the values param, because
 * it differs from Update Entry, where it is a choice.
 */
const upsertEntry: ActionDefinition<Input> = {
  key: "upsert-entry",
  type: "perform",
  resource: "entry",
  title: "Upsert Entry",
  idempotent: true,
  description: "Put a record on a list, updating the existing entry if there already is one. The " +
    "repeat-safe counterpart to Create Entry. Fails with MULTIPLE_MATCH_RESULTS if the record " +
    "already has more than one entry on that list.",
  params: [
    LIST_PARAM,
    {
      key: "parentObject",
      label: "Parent object",
      type: "string",
      required: true,
      placeholder: "people",
      hint: "Slug or UUID of the object the record belongs to.",
    },
    {
      key: "parentRecordId",
      label: "Parent record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
      hint:
        "UUID of the record. This is the match key — there is no matching-attribute option here.",
    },
    {
      ...ENTRY_VALUES_PARAM,
      required: false,
      hint: "**Multi-select attributes are always overwritten by this endpoint** — whatever you " +
        "send becomes the complete set, and omitted values are deleted. (Update Entry lets you " +
        "choose; this one does not.) " + ENTRY_VALUES_PARAM.hint,
    },
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, list_id, entry_id)" },
    { key: "entry_values", type: "object", label: "The entry's values after the write" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
    { key: "created_at", type: "string", label: "Creation timestamp" },
  ],

  async execute(input, ctx) {
    const entry = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/lists/${encodeURIComponent(input.list)}/entries`,
      {
        method: "PUT",
        body: entryValues(input.entryValues, {
          parent_object: input.parentObject,
          parent_record_id: input.parentRecordId,
        }),
      },
    );
    return { ...entry, values_flat: flattenValues(entry?.entry_values) };
  },
};

export default upsertEntry;
