import type { ActionDefinition } from "@w6w/types";
import { AttioClient, OBJECT_PARAM } from "../lib/client.ts";
import { flattenValues, RECORD_VALUES_PARAM, recordValues } from "../lib/values.ts";

interface Input {
  object: string;
  values: unknown;
}

/**
 * `POST /v2/objects/{object}/records` — create a record, failing on conflict.
 *
 * ## Create versus Upsert: this one throws, on purpose
 *
 * Verbatim: "This endpoint will throw on conflicts of unique attributes. If you
 * would prefer to update records on conflicts, please use the Upsert record
 * endpoint instead." So creating a person whose email already exists is a `409`,
 * not a silent second copy and not an update.
 *
 * That makes this the right action for "this is definitely new" and the wrong
 * one for lead intake, where the same address arrives twice a week. Upsert
 * Record is the integration workhorse.
 *
 * ## The body is doubly nested, and the values are forgiving
 *
 *     { "data": { "values": { "<slug or uuid>": <value> } } }
 *
 * Both `data` and `values` are `required` in the request schema. Inside
 * `values`, writes take shorthand — a bare scalar for a single-select
 * attribute, an array for a multi-select one — so there is no need to
 * reconstruct the array-of-typed-objects shape that reads come back in.
 *
 * The one that bites: **`name` written as a plain string is parsed as
 * `"Last, First"`**, and text without a comma "is interpreted as solely
 * comprising the first name". `{"name": "John Smith"}` therefore creates a
 * person whose first name is the string "John Smith", and returns 201 while
 * doing it. See `lib/values.ts` for the full list of shapes and traps; the
 * warning is repeated on the param itself, where it can actually be read.
 *
 * ## Some attributes cannot be written at all
 *
 * `logo_url` on companies is called out by name ("Please note, the `logo_url`
 * attribute cannot currently be set via the API"), `twitter_follower_count` is a
 * system attribute, and interaction-typed attributes are created only by Attio.
 * Attempting them returns `immutable_value` or `system_edit_unauthorized`.
 */
const createRecord: ActionDefinition<Input> = {
  key: "create-record",
  type: "perform",
  resource: "record",
  title: "Create Record",
  idempotent: false,
  description:
    "Create a record on any object. **Fails with a conflict** if a unique attribute already " +
    "matches an existing record — use Upsert Record if you would rather update in that case.",
  params: [OBJECT_PARAM, RECORD_VALUES_PARAM],
  output: [
    { key: "id", type: "object", label: "Composite id of the new record" },
    { key: "values", type: "object", label: "Attribute values as stored" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
    { key: "web_url", type: "string", label: "Link to the record in the Attio UI" },
  ],

  async execute(input, ctx) {
    const record = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/objects/${encodeURIComponent(input.object)}/records`,
      { method: "POST", body: recordValues(input.values) },
    );
    return { ...record, values_flat: flattenValues(record?.values) };
  },
};

export default createRecord;
