import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatSubscriber } from "../lib/client.ts";

interface Input {
  fieldId: string;
  fieldValue: string;
}

/**
 * Find subscribers by the value of a custom field.
 *
 * `GET /fb/subscriber/findByCustomField?field_id=…&field_value=…` →
 * `{ status, data: Subscriber[] }`.
 *
 * Three restrictions, all quoted from the spec's own description, and all of them
 * things a caller would otherwise discover the hard way:
 *
 *     "***Limit:*** 10 queries per second.
 *      This API method only works with Text and Number types of Custom User Fields.
 *      Results are sorted by last Custom User Field value update for a specific user.
 *      List is limited by 100 elements."
 *
 *   - **Text and Number only.** A `date`, `datetime` or `boolean` custom field
 *     cannot be searched here at all. This app cannot check the field's type
 *     without a second call, so it does not pretend to — the restriction is
 *     surfaced in the description and the hint instead of being silently hit.
 *   - **Sorted by last update, capped at 100, no pagination.** Same shape as
 *     `find-subscribers-by-name`: 100 results means "at least 100", and the ones
 *     you get are the most recently touched.
 *   - **`field_id` only.** Unlike the tag and field *writes*, there is no
 *     `findByCustomFieldName` — the id is the only key, so `list-custom-fields`
 *     is a prerequisite.
 *
 * `field_value` is typed `string` in the spec's parameter list even for Number
 * fields, so it is passed through as text without coercion. This is the one place
 * `coerceFieldValue` deliberately does **not** apply: it is a query parameter the
 * vendor types as a string, not a JSON field value.
 */
const findSubscribersByCustomField: ActionDefinition<Input> = {
  key: "find-subscribers-by-custom-field",
  type: "search",
  resource: "subscriber",
  title: "Find Subscribers by Custom Field",
  description:
    "Find subscribers by a custom field's value (GET /fb/subscriber/findByCustomField). Works " +
    "with Text and Number fields ONLY. Capped at 100, sorted by most recent update, no " +
    "pagination.",
  params: [
    {
      key: "fieldId",
      label: "Custom field ID",
      type: "string",
      required: true,
      hint: "From List Custom Fields. There is no search-by-field-name variant.",
    },
    {
      key: "fieldValue",
      label: "Value",
      type: "string",
      required: true,
      hint: "Sent as text — Manychat types this parameter as a string even for Number fields.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "array", label: "Subscribers (max 100)" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatSubscriber[]>>(
      "/fb/subscriber/findByCustomField",
      { field_id: input.fieldId, field_value: input.fieldValue },
    );
  },
};

export default findSubscribersByCustomField;
