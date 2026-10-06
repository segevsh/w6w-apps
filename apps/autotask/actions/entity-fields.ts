import type { ActionDefinition } from "@w6w/types";
import { AutotaskClient } from "../lib/client.ts";
import { canonicalEntity, ENTITIES } from "../lib/entities.ts";

/**
 * `GET /{Entity}/entityInformation/fields` — field definitions, and the PICKLIST ids.
 *
 * Almost every categorical field in Autotask (ticket `status`, `priority`, `queueID`, company
 * `companyType`, note `noteType`...) is an opaque integer whose meaning is configured per
 * database, so a workflow cannot hard-code them. This returns each field's type, whether it is
 * required or read-only, and for picklists the `{ value, label, isActive }` rows. Some picklists
 * depend on another field's value (`picklistParentValueField`, e.g. sub-issue type on issue type).
 */
const action: ActionDefinition = {
  key: "entity-fields",
  type: "read",
  resource: "entity",
  title: "Get entity fields and picklists",
  description:
    "The fields of an Autotask entity with their types, required/read-only flags and picklist " +
    "values — the only way to learn a database's status, priority and queue ids.",
  params: [
    {
      key: "entity",
      label: "Entity",
      type: "select",
      required: true,
      options: ENTITIES.map((e) => ({ value: e, label: e })),
    },
    {
      key: "field",
      label: "Only this field",
      type: "string",
      hint: "A field name, e.g. `status`. Empty returns every field (a large response).",
    },
  ],
  output: [
    { key: "fields", type: "array", label: "Field definitions" },
    { key: "requiredOnCreate", type: "array", label: "Names of required, writable fields" },
    { key: "picklists", type: "object", label: "Picklist values keyed by field name" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    const entity = canonicalEntity(i.entity);
    if (!entity) {
      throw new Error(`\`entity\` "${String(i.entity ?? "")}" is not a queryable Autotask entity`);
    }
    const res = await new AutotaskClient(ctx).call<{ fields?: Array<Record<string, unknown>> }>(
      "GET",
      `/${entity}/entityInformation/fields`,
    );
    let fields = res?.fields ?? [];
    const only = String(i.field ?? "").trim().toLowerCase();
    if (only) fields = fields.filter((f) => String(f.name ?? "").toLowerCase() === only);

    const picklists: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.isPickList && Array.isArray(f.picklistValues)) {
        picklists[String(f.name)] = (f.picklistValues as Array<Record<string, unknown>>).map((
          v,
        ) => ({
          value: v.value,
          label: v.label,
          isActive: v.isActive,
          ...(v.parentValue ? { parentValue: v.parentValue } : {}),
        }));
      }
    }
    return {
      fields,
      requiredOnCreate: fields.filter((f) => f.isRequired && !f.isReadOnly).map((f) => f.name),
      picklists,
    };
  },
};

export default action;
