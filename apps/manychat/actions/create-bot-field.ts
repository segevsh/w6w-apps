import type { ActionDefinition } from "@w6w/types";
import {
  coerceFieldValue,
  compact,
  FIELD_TYPE_OPTIONS,
  ManychatClient,
  type ManychatEnvelope,
  type ManychatValuedField,
} from "../lib/client.ts";

interface Input {
  name: string;
  type: string;
  description?: string;
  value?: string;
}

/**
 * Define a new Page-global bot field, optionally with a starting value.
 *
 * `POST /fb/page/createBotField` with `{ name, type, description, value }` →
 * `{ status, data: { field: {...} } }`.
 *
 * **This one takes `name`, not `caption`** — the opposite of
 * `createCustomField`, which requires `caption` and returns `name`. Same pack,
 * same vendor, adjacent endpoints, different word. Both are transcribed from the
 * spec's body schemas rather than made consistent, because consistency invented
 * here would just be a 400.
 *
 * `value` is typed `string` on the form and coerced by `coerceFieldValue` before
 * it goes on the wire: `"true"` becomes `true` and `"42"` becomes `42`, while
 * `"2026-08-03"`, `"007"` and anything else stay strings — matching the spec's
 * own worked examples (`'string'`, `123`, `true`, `'2018-07-18'`,
 * `'2018-07-02T00:00:00+00:00'`).
 *
 * `idempotent: false` — a repeat against an existing name is undefined in the
 * spec, and this one also carries a value, so a replay could overwrite.
 */
const createBotField: ActionDefinition<Input> = {
  key: "create-bot-field",
  type: "perform",
  idempotent: false,
  resource: "bot-field",
  title: "Create Bot Field",
  description:
    "Define a new Page-global bot field (POST /fb/page/createBotField). Takes `name` (unlike " +
    "Create Custom Field, which takes `caption`). Returns the field under `data.field`.",
  params: [
    { key: "name", label: "Field name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: FIELD_TYPE_OPTIONS,
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "value",
      label: "Initial value",
      type: "string",
      hint: "`true`/`false` and plain integers are sent as boolean/number; dates stay strings.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Result (`data.field`)" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).post<ManychatEnvelope<{ field?: ManychatValuedField }>>(
      "/fb/page/createBotField",
      compact({
        name: input.name,
        type: input.type,
        description: input.description,
        value: input.value === undefined ? undefined : coerceFieldValue(input.value),
      }),
    );
  },
};

export default createBotField;
