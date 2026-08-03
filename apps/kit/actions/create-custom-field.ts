import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  label: string;
}

/**
 * `idempotent: false` — Kit requires the label to be unique to the account and
 * returns `422` for a repeat, so a retry after a lost success is not a no-op.
 */
const createCustomField: ActionDefinition<Input> = {
  key: "create-custom-field",
  type: "perform",
  resource: "custom-field",
  title: "Create Custom Field",
  description:
    "Create a custom field. The label must be unique to the account; Kit derives the `key` from it (ASCII, lowercased, underscored) and that key is what Create/Update Subscriber use under `fields`.",
  idempotent: false,
  params: [
    {
      key: "label",
      label: "Label",
      type: "string",
      required: true,
      placeholder: "Last name",
      hint: "Surrounding whitespace is trimmed by Kit. Must be unique to the account.",
    },
  ],
  output: [{ key: "custom_field", type: "object", label: "Custom field" }],

  execute(input, ctx) {
    return new KitClient(ctx).request("/custom_fields", {
      method: "POST",
      body: { label: input.label },
    });
  },
};

export default createCustomField;
