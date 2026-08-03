import type { ActionDefinition } from "@w6w/types";
import { coerceFieldValue, ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface FieldInput {
  field_id?: number | string;
  field_name?: string;
  field_value?: unknown;
}

interface Input {
  subscriberId: string;
  fields: FieldInput[];
}

/**
 * Set several custom fields on one subscriber in a single call.
 *
 * `POST /fb/subscriber/setCustomFields` with `{ subscriber_id, fields: [{
 * field_id, field_name, field_value }] }`.
 *
 * Same quirk as `set-bot-fields`: the element schema marks **all three** of
 * `field_id`, `field_name` and `field_value` required, where the two
 * single-field endpoints take one identifier or the other. Whether that is
 * enforced is not verifiable without an account, so elements are forwarded as
 * given and only `field_value` is coerced. Nothing is inferred: turning a name
 * into an id would need a lookup this action does not perform and could bind the
 * write to the wrong field.
 *
 * The saving is real — one request at 10 queries per second instead of N — and
 * it is atomic from the caller's point of view in the sense that there is one
 * failure to handle rather than N partial ones. The spec does not promise
 * transactional behaviour on the vendor side, and this comment does not either.
 *
 * `idempotent: true` — absolute writes throughout.
 */
const setSubscriberFields: ActionDefinition<Input> = {
  key: "set-subscriber-fields",
  type: "perform",
  idempotent: true,
  resource: "subscriber",
  title: "Set Subscriber Fields (batch)",
  description: "Set several custom fields on one subscriber in one call " +
    "(POST /fb/subscriber/setCustomFields). Manychat's schema marks `field_id`, `field_name` " +
    "AND `field_value` required on each element — elements are forwarded verbatim.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "array",
      required: true,
      hint: '`[{ "field_id": 7, "field_name": "plan", "field_value": "pro" }]`. ' +
        "String values that read as `true`/`false` or a plain integer are coerced.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const fields = (input.fields ?? []).map((f) => ({
      ...f,
      field_value: coerceFieldValue(f.field_value),
    }));
    return new ManychatClient(ctx).post<ManychatEnvelope>("/fb/subscriber/setCustomFields", {
      subscriber_id: input.subscriberId,
      fields,
    });
  },
};

export default setSubscriberFields;
