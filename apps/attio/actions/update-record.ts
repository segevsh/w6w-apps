import type { ActionDefinition } from "@w6w/types";
import { AttioClient, OBJECT_PARAM } from "../lib/client.ts";
import {
  flattenValues,
  MULTISELECT_MODE_PARAM,
  multiselectMethod,
  RECORD_VALUES_PARAM,
  recordValues,
} from "../lib/values.ts";

interface Input {
  object: string;
  recordId: string;
  values: unknown;
  multiselect?: string;
}

/**
 * `PATCH` **or** `PUT /v2/objects/{object}/records/{record_id}` — and the choice
 * between them is the only thing on this page that can destroy data.
 *
 * ## Two verbs, one URL, opposite multiselect semantics
 *
 * Attio documents them as two endpoints. They differ in a single sentence:
 *
 *   - **PATCH** — "Update a record (append multiselect values)": "If the update
 *     payload includes multiselect attributes, the values supplied will be
 *     created and prepended to the list of values that already exist (if any).
 *     Use the `PUT` endpoint to overwrite or remove multiselect attribute
 *     values."
 *   - **PUT** — "Update a record (overwrite multiselect values)": "the values
 *     supplied will overwrite/remove the list of values that already exist (if
 *     any). Use the `PATCH` endpoint to append multiselect values without
 *     removing those that already exist."
 *
 * Single-value attributes are replaced either way; only multi-select ones
 * (tags, `domains`, `email_addresses`, `phone_numbers`, multi-select selects and
 * actor references) diverge.
 *
 * ## Why this is a required param and not a hidden verb
 *
 * Because the wrong choice **succeeds**. Sending "the categories are now exactly
 * [Aerospace]" as an append returns `200`, reports the record as updated, and
 * leaves the four old categories sitting there. Nothing in the response says so.
 * A workflow that runs nightly then accumulates values forever, and the bug
 * surfaces months later as a record with thirty tags.
 *
 * Exposing this as a choice at the form — with `append` as the safer default,
 * since it cannot delete anything — makes the destructive option deliberate.
 * There is no third mode: **overwrite is the only way to remove a multiselect
 * value**, so hiding it would make clearing a field impossible.
 *
 * ## What this action deliberately does not do
 *
 * It does not read the record first and merge. Attio's own semantics are the
 * contract; a read-modify-write here would add a race and a second call to solve
 * a problem the API already models.
 */
const updateRecord: ActionDefinition<Input> = {
  key: "update-record",
  type: "perform",
  resource: "record",
  title: "Update Record",
  idempotent: true,
  description:
    "Update a record by id. **Choose how multi-select attributes are handled**: append (PATCH) " +
    "adds values and can never remove one; overwrite (PUT) makes the supplied values the complete " +
    "set and is the only way to clear one. Picking the wrong mode still returns 200.",
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
      hint: "UUID of the record to update.",
    },
    RECORD_VALUES_PARAM,
    MULTISELECT_MODE_PARAM,
  ],
  output: [
    { key: "id", type: "object", label: "Composite id of the record" },
    { key: "values", type: "object", label: "Attribute values as stored after the write" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
    { key: "web_url", type: "string", label: "Link to the record in the Attio UI" },
  ],

  async execute(input, ctx) {
    const record = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/objects/${encodeURIComponent(input.object)}/records/${encodeURIComponent(input.recordId)}`,
      { method: multiselectMethod(input.multiselect), body: recordValues(input.values) },
    );
    return { ...record, values_flat: flattenValues(record?.values) };
  },
};

export default updateRecord;
