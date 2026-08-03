import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  entryId: string | number;
  entry: Record<string, unknown>;
}

/**
 * `PUT /gf/v2/entries/[ENTRY_ID]` — replace an entry.
 *
 * The vendor is blunt about the semantics, and it is the single easiest thing
 * to get wrong here: "There are no required properties, but values not provided
 * WILL BE BLANKED OUT." This is a replace, not a patch. The safe pattern is
 * Get Entry -> modify the object -> pass the WHOLE object back in.
 *
 * That is why this action takes one `entry` object rather than a field-by-field
 * form: a partial parameter set would look like a patch and quietly wipe every
 * value it omitted.
 *
 * Capability: `gravityforms_edit_entries`.
 */
const entryUpdate: ActionDefinition<Input> = {
  key: "entry-update",
  type: "perform",
  resource: "entry",
  title: "Update Entry",
  description:
    "Replace an entry with a full Entry Object. Anything omitted is blanked out — fetch the entry first, edit it, then send it back.",
  // A replace with an explicit target and a complete body: sending it twice
  // leaves exactly the same entry behind.
  idempotent: true,
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    {
      key: "entry",
      label: "Entry Object",
      type: "json",
      required: true,
      hint:
        "The COMPLETE Entry Object — field values keyed by field ID plus any entry properties " +
        "(`status`, `is_read`, `is_starred`, `payment_status`, …). Values you leave out are " +
        "blanked out, so start from Get Entry.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Entry ID" },
    { key: "form_id", type: "string", label: "Form ID" },
    { key: "date_created", type: "string", label: "Created (site time)" },
    { key: "status", type: "string", label: "Entry status" },
  ],

  execute(input, ctx) {
    ctx.log("info", "replacing Gravity Forms entry", { entryId: input.entryId });
    const client = GravityFormsClient.fromConnection(ctx);
    return client.request(`/entries/${encodeURIComponent(String(input.entryId))}`, {
      method: "PUT",
      body: input.entry ?? {},
    });
  },
};

export default entryUpdate;
