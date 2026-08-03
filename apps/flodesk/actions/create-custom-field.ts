import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  label: string;
}

/**
 * `POST /v1/custom-fields` — takes exactly one property, `label`, and it is the
 * only required one. Flodesk derives the `key` (which is what subscriber
 * `custom_fields` writes are addressed by) and returns it; there is no way to
 * choose the key, and no type/format to declare — every Flodesk custom field
 * holds a string.
 *
 * `idempotent: false` — the endpoint answers `201` and Flodesk documents no
 * uniqueness constraint on `label`, so a replay may well create a second field.
 * There is also no update or delete endpoint for custom fields, which makes a
 * spurious duplicate awkward to clean up — one more reason not to advertise this
 * as safe to retry.
 */
const createCustomField: ActionDefinition<Input> = {
  key: "create-custom-field",
  type: "perform",
  resource: "custom-field",
  title: "Create Custom Field",
  description:
    "Create a custom field from a display label. Flodesk generates the `key` and returns it. Not idempotent, and Flodesk publishes no way to update or delete a custom field afterwards.",
  idempotent: false,
  params: [
    {
      key: "label",
      label: "Label",
      type: "string",
      required: true,
      placeholder: "Favorite color",
      hint:
        "The friendly display label. Flodesk derives the `key` from it — you cannot choose the key.",
    },
  ],
  output: [{ key: "customField", type: "object", label: "The created field, with its `key`" }],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request("/custom-fields", {
      method: "POST",
      body: { label: input.label },
    });
  },
};

export default createCustomField;
