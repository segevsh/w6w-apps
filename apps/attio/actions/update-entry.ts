import type { ActionDefinition } from "@w6w/types";
import { AttioClient, LIST_PARAM } from "../lib/client.ts";
import {
  ENTRY_VALUES_PARAM,
  entryValues,
  flattenValues,
  MULTISELECT_MODE_PARAM,
  multiselectMethod,
} from "../lib/values.ts";

interface Input {
  list: string;
  entryId: string;
  entryValues: unknown;
  multiselect?: string;
}

/**
 * `PATCH` **or** `PUT /v2/lists/{list}/entries/{entry_id}` — the entry-side twin
 * of Update Record, with the same append-versus-overwrite fork.
 *
 * Verbatim, the two pages differ in one sentence each:
 *
 *   - **PATCH** — "If the update payload includes multiselect attributes, the
 *     values supplied will be created and prepended to the list of values that
 *     already exist (if any). Use the `PUT` endpoint to overwrite or remove
 *     multiselect attribute values."
 *   - **PUT** — "the values supplied will overwrite/remove the list of values
 *     that already exist (if any)."
 *
 * See `lib/values.ts` for why that is a required param here rather than a hidden
 * verb: the wrong choice returns 200 and leaves stale values behind, which is
 * invisible until a record has accumulated a year of them.
 *
 * Only `entry_values` is updatable. The parent record of an existing entry
 * cannot be changed through this endpoint — the request schema has
 * `additionalProperties: false` and lists `entry_values` as its only property.
 * Moving an entry to a different record means deleting it and creating another.
 */
const updateEntry: ActionDefinition<Input> = {
  key: "update-entry",
  type: "perform",
  resource: "entry",
  title: "Update Entry",
  idempotent: true,
  description:
    "Update a list entry's own attribute values. **Choose how multi-select attributes are " +
    "handled**: append (PATCH) can never remove a value; overwrite (PUT) makes the supplied " +
    "values the complete set. The parent record cannot be changed here.",
  params: [
    LIST_PARAM,
    {
      key: "entryId",
      label: "Entry id",
      type: "string",
      required: true,
      placeholder: "2e6e29ea-c4e0-4f44-842d-78a891f8c156",
    },
    ENTRY_VALUES_PARAM,
    MULTISELECT_MODE_PARAM,
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, list_id, entry_id)" },
    { key: "entry_values", type: "object", label: "The entry's values after the write" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
  ],

  async execute(input, ctx) {
    const entry = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/lists/${encodeURIComponent(input.list)}/entries/${encodeURIComponent(input.entryId)}`,
      {
        method: multiselectMethod(input.multiselect),
        body: entryValues(input.entryValues),
      },
    );
    return { ...entry, values_flat: flattenValues(entry?.entry_values) };
  },
};

export default updateEntry;
