import type { ActionDefinition } from "@w6w/types";
import { coerceFieldValue, ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface FieldInput {
  field_id?: number | string;
  field_name?: string;
  field_value?: unknown;
}

interface Input {
  fields: FieldInput[];
}

/**
 * Set several Page-global bot fields in one call.
 *
 * `POST /fb/page/setBotFields` with `{ fields: [{ field_id, field_name,
 * field_value }] }`.
 *
 * ## The spec asks for both identifiers on every element
 *
 * This is the one place the API is genuinely odd, and it is worth stating rather
 * than smoothing over. The item schema is:
 *
 *     "required": ["field_id", "field_name", "field_value"]
 *
 * — all three, where the two single-field endpoints take `field_id` **or**
 * `field_name`. Whether Manychat actually enforces that, or whether one
 * identifier suffices, is **not verifiable without an account**, and this app
 * does not pretend to know: it forwards each element as given, coercing only
 * `field_value`. A caller who supplies just one identifier is passing what the
 * two sibling endpoints accept and may well be fine; a caller who supplies both
 * is passing what the spec asks for. Neither is silently rewritten into the
 * other, because inventing an id from a name (or a name from an id) would need a
 * lookup this action does not do and could bind the write to the wrong field.
 *
 * The rate limit is 10 queries per second — the same as `setBotField` — so
 * batching is a real saving over N single calls.
 *
 * `idempotent: true`, for the same reason as `set-bot-field`: absolute writes.
 */
const setBotFields: ActionDefinition<Input> = {
  key: "set-bot-fields",
  type: "perform",
  idempotent: true,
  resource: "bot-field",
  title: "Set Bot Fields (batch)",
  description:
    "Set several Page-global bot fields in one call (POST /fb/page/setBotFields). Manychat's " +
    "schema marks `field_id`, `field_name` AND `field_value` required on each element — supply " +
    "what you have; elements are forwarded verbatim.",
  params: [
    {
      key: "fields",
      label: "Fields",
      type: "array",
      required: true,
      hint: '`[{ "field_id": 1, "field_name": "promo", "field_value": "SUMMER" }]`. ' +
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
    return new ManychatClient(ctx).post<ManychatEnvelope>("/fb/page/setBotFields", { fields });
  },
};

export default setBotFields;
