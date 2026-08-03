import type { ActionDefinition } from "@w6w/types";
import { AttioClient, OBJECT_PARAM } from "../lib/client.ts";
import { flattenValues } from "../lib/values.ts";

interface Input {
  object: string;
  recordId: string;
}

/**
 * `GET /v2/objects/{object}/records/{record_id}` — one record by id.
 *
 * ## The id is composite, and the `record_id` alone is not a key
 *
 * The response's `id` is an object, not a string:
 *
 *     "id": { "workspace_id": "5821c091-…", "object_id": "7c430b6d-…",
 *             "record_id": "d2c2f990-…" }
 *
 * From the Slugs and IDs page: "Uniqueness of an ID is only guaranteed when the
 * ID is taken as a whole, using all sub-IDs… it is unsafe to assume in the
 * example above that the record is the only record with `record_id=…`". In
 * practice collisions are rare, and "if you are only operating on data from your
 * own workspace, you can essentially disregard the `workspace_id` key" — which
 * is why this action takes the object and the bare `record_id`, exactly as the
 * path does.
 *
 * ## A 404 here may mean "not yet" rather than "not found"
 *
 * The spec gives this endpoint two 404 codes: `not_found` and
 * **`merge_in_progress`**. A large record merge is applied asynchronously, and
 * until it finishes the merged record answers 404 with the second code. The
 * client's error message calls that out by name rather than letting it read as a
 * deletion.
 *
 * ## `values_flat`
 *
 * The raw `values` map is Attio's read shape — an array of typed objects per
 * attribute, each wrapped in a four-field envelope. `values_flat` is the same
 * data reduced to scalars so a downstream step can write
 * `{{record.values_flat.name}}` instead of `{{record.values[0].full_name}}`.
 * Both are returned; see `lib/values.ts` for exactly what the reduction does and
 * why it keys on property names rather than on `attribute_type`.
 */
const getRecord: ActionDefinition<Input> = {
  key: "get-record",
  type: "read",
  resource: "record",
  title: "Get Record",
  description:
    "Fetch a single record by its `record_id`, on any object. Returns Attio's raw attribute " +
    "values plus a flattened scalar view of them.",
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
      hint:
        "The record's UUID — the `record_id` half of the composite id, not the whole `id` object.",
    },
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, object_id, record_id)" },
    { key: "values", type: "object", label: "Attribute values, Attio's raw read shape" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
    { key: "created_at", type: "string", label: "Creation timestamp" },
    { key: "web_url", type: "string", label: "Link to the record in the Attio UI" },
  ],

  async execute(input, ctx) {
    const record = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/objects/${encodeURIComponent(input.object)}/records/${encodeURIComponent(input.recordId)}`,
    );
    return { ...record, values_flat: flattenValues(record?.values) };
  },
};

export default getRecord;
