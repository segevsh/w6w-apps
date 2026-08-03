import type { ActionDefinition } from "@w6w/types";
import { CloseClient } from "../lib/client.ts";

interface Input {
  objectType: string;
}

/**
 * `GET /custom_field_schema/{object_type}/` — every Custom Field on an object
 * type, regular and shared, in display order.
 *
 * ## Why the schema endpoint and not `/custom_field/lead/`
 *
 * Close publishes seven different Custom Field endpoints — one per object type,
 * plus a shared-field API and an association API. This action uses the schema
 * endpoint instead, on Close's own recommendation: it "presents you with *all*
 * (regular and shared) Custom Fields that belong on a given object, in the order
 * you've defined. It's the best endpoint to use when asking 'What Custom Fields
 * can I set on this object?'", and the Custom Fields page repeats it — "We
 * recommend this endpoint for fetching Custom Fields available in your
 * organization."
 *
 * The per-type endpoints miss shared fields, which is precisely the gap that
 * makes a "why isn't my custom field here" bug.
 *
 * ## What it is for
 *
 * The `customFields` param on Create/Update Lead, Contact and Opportunity takes
 * a map keyed by field **id** (`cf_...`). Those ids are per-organization and
 * undiscoverable otherwise, so this action is the lookup step. Close is
 * deprecating the by-name alternative — the `custom` dict and the
 * `custom.FIELD_NAME` form are both "deprecated and will be removed from the
 * API" — so id-based access is the only form with a future.
 *
 * ## `object_type` is a path segment, and it is compound
 *
 * Documented values: `lead`, `contact`, `opportunity`, `activity/<cat_id>` and
 * `custom_object/<cotype_id>`. The last two embed a second id, so this param
 * cannot be a plain `select` over three names. It is free text with a validation
 * pattern that admits exactly the documented shapes and nothing else — in
 * particular no `..` traversal, since the value lands in a URL path.
 */
const listCustomFields: ActionDefinition<Input> = {
  key: "list-custom-fields",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "List every Custom Field — regular and shared — available on an object type, in display " +
    "order. Use it to find the `cf_...` ids the customFields params expect.",
  params: [
    {
      key: "objectType",
      label: "Object type",
      type: "string",
      required: true,
      default: "lead",
      placeholder: "lead",
      hint: "`lead`, `contact`, `opportunity`, `activity/<custom_activity_type_id>` or " +
        "`custom_object/<custom_object_type_id>`.",
      validation: {
        pattern: "^(lead|contact|opportunity|(activity|custom_object)/[A-Za-z0-9_]+)$",
      },
    },
  ],
  output: [{ key: "fields", type: "array", label: "Custom fields in display order" }],

  execute(input, ctx) {
    // Re-checked here, not only at the form: this value becomes a URL path
    // segment, and a param validation is a UI affordance rather than a
    // guarantee about what reaches `execute`.
    if (
      !/^(lead|contact|opportunity|(activity|custom_object)\/[A-Za-z0-9_]+)$/.test(
        input.objectType,
      )
    ) {
      throw new Error(
        `unsupported object type "${input.objectType}" — expected lead, contact, opportunity, ` +
          `activity/<id> or custom_object/<id>`,
      );
    }
    return new CloseClient(ctx).request(`/custom_field_schema/${input.objectType}/`);
  },
};

export default listCustomFields;
