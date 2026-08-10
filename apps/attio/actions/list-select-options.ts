import type { ActionDefinition } from "@w6w/types";
import { AttioClient, compact, optionsFrom, PAGE_OUTPUT } from "../lib/client.ts";
import { ATTRIBUTE_TARGETS } from "./list-attributes.ts";

interface Input {
  target: string;
  identifier: string;
  attribute: string;
  showArchived?: boolean;
}

/**
 * `GET /v2/{target}/{identifier}/attributes/{attribute}/options` — the legal
 * values of a select attribute.
 *
 * ## Why this is not optional reading before a write
 *
 * Select values are written by **title**, and an unrecognised title is a hard
 * failure rather than a new option: "If you attempt to write a value where the
 * ID or title cannot be found, you will receive an error rather than create a
 * new select option."
 *
 * That is the good outcome — it fails loudly. But it means a workflow that maps
 * an external system's category names onto an Attio select will break the moment
 * someone renames an option in the UI, and the only way to write the mapping
 * correctly in the first place is to read the option list. Hence this action.
 *
 * Each option returns a composite `id` ending in `option_id`, its `title`, and
 * `is_archived`. Writes accept either form: `{"categories": ["3D Printing"]}` by
 * title, or `{"categories": [{"option": "14938464-cae9-…"}]}` by id. The id
 * survives a rename; the title does not.
 *
 * Statuses are a separate, parallel endpoint — see List Statuses. Attio keeps
 * them apart because a status carries extra state (`target_time_in_status`,
 * `celebration_enabled`) that a select option does not.
 */
const listSelectOptions: ActionDefinition<Input> = {
  key: "list-select-options",
  type: "read",
  resource: "attribute",
  title: "List Select Options",
  description:
    "The available options of a select attribute, with each option's title and UUID. Read this " +
    "before writing select values: an unknown title is rejected, not created, and titles change " +
    "while ids do not.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "select",
      required: true,
      default: "objects",
      options: optionsFrom(ATTRIBUTE_TARGETS),
      hint: "Whether the attribute is on an object or on a list.",
    },
    {
      key: "identifier",
      label: "Object or list",
      type: "string",
      required: true,
      placeholder: "companies",
      hint: "The `api_slug` or UUID of the object or list.",
    },
    {
      key: "attribute",
      label: "Attribute",
      type: "string",
      required: true,
      placeholder: "categories",
      hint: "Slug or UUID of the **select** attribute. List Attributes shows which are selects.",
    },
    {
      key: "showArchived",
      label: "Include archived",
      type: "boolean",
      advanced: true,
      hint: "Archived options keep their historical values but can no longer be assigned.",
    },
  ],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    const { records } = await new AttioClient(ctx).list(
      `/${encodeURIComponent(input.target)}/${encodeURIComponent(input.identifier)}/attributes/${
        encodeURIComponent(input.attribute)
      }/options`,
      { query: compact({ show_archived: input.showArchived }) },
    );
    return { records };
  },
};

export default listSelectOptions;
