import type { ActionDefinition } from "@w6w/types";
import { AttioClient, LIST_PARAM } from "../lib/client.ts";
import { flattenValues } from "../lib/values.ts";

interface Input {
  list: string;
  entryId: string;
}

/**
 * `GET /v2/lists/{list}/entries/{entry_id}` — one list entry.
 *
 * Both segments are required: an `entry_id` is unique only within its list, in
 * the same way a `record_id` is unique only within its object. The composite id
 * returned is `{workspace_id, list_id, entry_id}`.
 *
 * The entry's own attribute values arrive as `entry_values` — the list's
 * attributes, not the parent record's — and `values_flat` is derived from them.
 * To read the parent record's attributes, take `parent_object` and
 * `parent_record_id` from the response and call Get Record.
 */
const getEntry: ActionDefinition<Input> = {
  key: "get-entry",
  type: "read",
  resource: "entry",
  title: "Get Entry",
  description: "Fetch one list entry by id. Returns the entry's own attribute values (the list's " +
    "attributes, not the parent record's) plus a flattened scalar view of them.",
  params: [
    LIST_PARAM,
    {
      key: "entryId",
      label: "Entry id",
      type: "string",
      required: true,
      placeholder: "2e6e29ea-c4e0-4f44-842d-78a891f8c156",
      hint: "UUID of the entry. Unique within its list, so the list is required too.",
    },
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, list_id, entry_id)" },
    { key: "parent_record_id", type: "string", label: "The record this entry points at" },
    { key: "parent_object", type: "string", label: "That record's object slug" },
    { key: "entry_values", type: "object", label: "The list's attribute values, raw read shape" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
    { key: "created_at", type: "string", label: "Creation timestamp" },
  ],

  async execute(input, ctx) {
    const entry = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/lists/${encodeURIComponent(input.list)}/entries/${encodeURIComponent(input.entryId)}`,
    );
    return { ...entry, values_flat: flattenValues(entry?.entry_values) };
  },
};

export default getEntry;
