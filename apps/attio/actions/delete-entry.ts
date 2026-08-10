import type { ActionDefinition } from "@w6w/types";
import { AttioClient, LIST_PARAM } from "../lib/client.ts";

interface Input {
  list: string;
  entryId: string;
}

/**
 * `DELETE /v2/lists/{list}/entries/{entry_id}` — take a record off a list.
 *
 * This removes the **entry**, not the record. The person or company stays where
 * it is on its object; only its membership of this list, and any values the list
 * held about it, go away. That distinction is the whole reason lists exist
 * separately from objects, and it is worth stating on the form because "delete"
 * reads alarmingly next to a CRM contact.
 *
 * The entry itself is gone for good — entries have no archived state (Attio's
 * Archiving vs deleting page limits archiving to attributes, select options and
 * statuses). Re-adding the record with Create Entry produces a new entry with a
 * new id and no values.
 *
 * The response is `200` with an empty object; `deleted: true` below is this
 * action's summary of a successful call, not something Attio sent.
 */
const deleteEntry: ActionDefinition<Input> = {
  key: "delete-entry",
  type: "perform",
  resource: "entry",
  title: "Delete Entry",
  idempotent: true,
  description:
    "Remove a record from a list by deleting its entry. **The record itself is untouched** — " +
    "only the list membership and the entry's own values are deleted, and that part is not " +
    "reversible.",
  params: [
    LIST_PARAM,
    {
      key: "entryId",
      label: "Entry id",
      type: "string",
      required: true,
      placeholder: "2e6e29ea-c4e0-4f44-842d-78a891f8c156",
      hint: "UUID of the entry to remove. The parent record is not affected.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when Attio accepted the delete" },
    { key: "entry_id", type: "string", label: "The id that was deleted" },
  ],

  async execute(input, ctx) {
    await new AttioClient(ctx).request(
      `/lists/${encodeURIComponent(input.list)}/entries/${encodeURIComponent(input.entryId)}`,
      { method: "DELETE" },
    );
    return { deleted: true, entry_id: input.entryId };
  },
};

export default deleteEntry;
