import type { ActionDefinition } from "@w6w/types";
import { boolToInt, GravityFormsClient } from "../lib/client.ts";

interface Input {
  entryId: string | number;
  fieldIds?: string;
  labels?: boolean;
}

/**
 * `GET /gf/v2/entries/[ENTRY_ID]` — one entry.
 *
 * The response is a FLAT object: entry metadata (`id`, `form_id`,
 * `date_created`, …) sits alongside the submitted values, which are keyed by
 * field ID — including the dotted sub-input form for composite fields
 * (`"1.3"` for a Name field's first name). Set Include Field Labels to get a
 * `_labels` map alongside them.
 */
const entryGet: ActionDefinition<Input> = {
  key: "entry-get",
  type: "read",
  resource: "entry",
  title: "Get Entry",
  description: "Fetch one entry by ID, with its field values keyed by field ID.",
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    {
      key: "fieldIds",
      label: "Field IDs",
      type: "string",
      hint: "Comma-separated list of fields to include in the response (`_field_ids`).",
    },
    {
      key: "labels",
      label: "Include Field Labels",
      type: "boolean",
      hint: "Adds a `_labels` map to the entry (`_labels=1`).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Entry ID" },
    { key: "form_id", type: "string", label: "Form ID" },
    { key: "date_created", type: "string", label: "Created (site time)" },
    { key: "status", type: "string", label: "Entry status" },
    { key: "_labels", type: "object", label: "Field labels, when requested" },
  ],

  execute(input, ctx) {
    const client = GravityFormsClient.fromConnection(ctx);
    return client.request(`/entries/${encodeURIComponent(String(input.entryId))}`, {
      query: { _field_ids: input.fieldIds, _labels: boolToInt(input.labels) },
    });
  },
};

export default entryGet;
