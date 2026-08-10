import type { ActionDefinition } from "@w6w/types";
import { AttioClient, compact, OBJECT_PARAM, PAGE_OUTPUT, pageParams } from "../lib/client.ts";
import { scalarOf } from "../lib/values.ts";

interface Input {
  object: string;
  recordId: string;
  attribute: string;
  showHistoric?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v2/objects/{object}/records/{record_id}/attributes/{attribute}/values`
 * — one attribute's values, optionally including everything it used to be.
 *
 * ## The only way to read history
 *
 * Every value carries `active_from` and `active_until`, and "Most endpoints will
 * only return active values, meaning this value is usually `null`. In special
 * cases, such as the list record attribute values API, you can also query
 * historic data." This is that special case: `show_historic=true` returns the
 * full sequence, "sorted from oldest to newest (by `active_from`)".
 *
 * That makes it the answer to "when did this deal's stage change", which nothing
 * else in the API can tell you.
 *
 * ## Three ways it declines, all of them documented
 *
 *  1. **`show_historic` is refused on some attributes.** "Historic values cannot
 *     be queried on COMINT (Communication Intelligence) or enriched attributes
 *     and the endpoint will return a 400 error if this is attempted." So the
 *     interaction-typed attributes — last email, next calendar event — and the
 *     enrichment attributes on people and companies are current-value-only.
 *  2. **Billing can silently empty it.** "Some attributes are subject to billing
 *     status and will return an empty array of values if the workspace being
 *     queried does not have the required billing flag enabled." An empty result
 *     is therefore not proof the attribute is unset — it may be proof the plan
 *     does not include it. Worth knowing before writing a workflow branch on
 *     "no value".
 *  3. **A wrong slug is a 404**, with the message naming the slug.
 *
 * `values_flat` reduces each entry to its scalar (see `lib/values.ts`) while the
 * raw array keeps `active_from` / `active_until`, which is the whole point of
 * asking for history.
 */
const listRecordAttributeValues: ActionDefinition<Input> = {
  key: "list-record-attribute-values",
  type: "read",
  resource: "record",
  title: "List Record Attribute Values",
  description:
    "Read one attribute's value(s) on one record — and, with Historic on, every value it has " +
    "ever held, oldest first. The only endpoint that exposes value history.",
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
    },
    {
      key: "attribute",
      label: "Attribute",
      type: "string",
      required: true,
      placeholder: "stage",
      hint: "The attribute's `api_slug` or UUID. List Attributes gives you both.",
    },
    {
      key: "showHistoric",
      label: "Include historic values",
      type: "boolean",
      hint:
        "Off by default, returning only currently-active values. On, returns the full history " +
        "oldest-first. **Returns 400** if the attribute is a communication-intelligence or " +
        "enrichment attribute — those keep no queryable history.",
    },
    ...pageParams(),
  ],
  output: [
    ...PAGE_OUTPUT,
    { key: "values_flat", type: "array", label: "Each value reduced to its scalar, in order" },
  ],

  async execute(input, ctx) {
    const { records } = await new AttioClient(ctx).list(
      `/objects/${encodeURIComponent(input.object)}/records/${
        encodeURIComponent(input.recordId)
      }/attributes/${encodeURIComponent(input.attribute)}/values`,
      {
        query: compact({
          show_historic: input.showHistoric,
          limit: input.limit,
          offset: input.offset,
        }),
      },
    );
    return { records, values_flat: records.map(scalarOf) };
  },
};

export default listRecordAttributeValues;
