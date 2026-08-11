import type { ActionDefinition } from "@w6w/types";
import { encodeId, type ListResult, ProductboardClient, toList } from "../lib/client.ts";
import { entityTypeOptions, listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/entities/fields/{id}/values` — the options a select field accepts.
 *
 * The other half of the configuration story. `entity-configuration-get` says
 * *"this workspace has a single-select field `9fe06369-…`"*; this says which
 * values that field will accept. Without it, setting a select field means
 * guessing at option names, and a wrong guess is a `422` at write time rather
 * than an error you could have caught first.
 *
 * `id` here is a **field** id, not an entity id — for a custom field that is
 * its UUID, and for a built-in it is the field's name (`status`).
 */
interface Input {
  fieldId: string;
  assignedEntityTypes?: string[] | string;
  pageCursor?: string;
}

const entityFieldValueList: ActionDefinition<Input, ListResult> = {
  key: "entity-field-value-list",
  type: "search",
  resource: "entity",
  title: "List field values",
  description:
    "List the values a select or status field accepts, so a write can use a real option rather " +
    "than a guess.",
  params: [
    {
      key: "fieldId",
      label: "Field ID",
      type: "string",
      required: true,
      placeholder: "9fe06369-0801-4a31-a900-0051aa78e01c",
      hint: "The FIELD id, not an entity id — a UUID for a custom field, or the field name for a " +
        "built-in one. Run List entity configurations to find it.",
    },
    {
      key: "assignedEntityTypes",
      label: "Assigned entity types",
      type: "multiselect",
      options: entityTypeOptions,
      hint: "Sent as repeated `assignedEntityType[]` values. Narrows to the values usable on " +
        "those entity types.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list(
      `/entities/fields/${encodeId(input.fieldId)}/values`,
      {
        query: {
          "assignedEntityType[]": toList(input.assignedEntityTypes),
          pageCursor: input.pageCursor,
        },
      },
    );
  },
};

export default entityFieldValueList;
