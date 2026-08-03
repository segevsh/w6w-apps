import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  FIELD_TYPE_OPTIONS,
  ManychatClient,
  type ManychatCustomField,
  type ManychatEnvelope,
} from "../lib/client.ts";

interface Input {
  caption: string;
  type: string;
  description?: string;
}

/**
 * Define a new subscriber custom field on the Page.
 *
 * `POST /fb/page/createCustomField` with `{ caption, type, description? }` →
 * `{ status, data: { field: { id, name, type, description } } }`.
 *
 * **The request says `caption`; the response says `name`.** That asymmetry is in
 * the spec — `createCustomField`'s body schema requires `caption`, while the
 * `Custom Field` schema it returns has no `caption` at all and carries `name`.
 * Sending `name` here would fail the required-field check. The param is labelled
 * "Field name" because that is what it becomes, and the vendor's wire name is in
 * the hint.
 *
 * `type` is one of `text`, `number`, `date`, `datetime`, `boolean` — the same
 * five enumerated on `Custom Field`, `Bot Field` and `Subscriber Custom Field`,
 * and the reason `coerceFieldValue` exists in `lib/client.ts`. It cannot be
 * changed after creation through this API (no update operation is published), so
 * it is required with no default rather than being guessed at `text`.
 *
 * `idempotent: false` — the spec does not define what a duplicate caption does.
 */
const createCustomField: ActionDefinition<Input> = {
  key: "create-custom-field",
  type: "perform",
  idempotent: false,
  resource: "custom-field",
  title: "Create Custom Field",
  description:
    "Define a new subscriber custom field (POST /fb/page/createCustomField). The request field " +
    "is `caption`; the returned object calls it `name`. Returns the field under `data.field`.",
  params: [
    {
      key: "caption",
      label: "Field name",
      type: "string",
      required: true,
      hint: "Sent as `caption`; comes back as `name`.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: FIELD_TYPE_OPTIONS,
      hint: "No update endpoint exists — the type is fixed once the field is created.",
    },
    { key: "description", label: "Description", type: "string" },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Result (`data.field`)" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).post<ManychatEnvelope<{ field?: ManychatCustomField }>>(
      "/fb/page/createCustomField",
      compact({
        caption: input.caption,
        type: input.type,
        description: input.description,
      }),
    );
  },
};

export default createCustomField;
