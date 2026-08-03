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
 * `GET /v2/{target}/{identifier}/attributes/{attribute}/statuses` — the stages
 * of a status attribute.
 *
 * Status is Attio's pipeline type — "similar to select attributes, originally
 * designed for use in Lists". A deal's `stage` is one, and so is the column a
 * card sits in on a kanban board.
 *
 * Same contract as select options, and the same reason to read it first: values
 * are written by **title**, and "if you attempt to write a value where the ID or
 * title cannot be found, you will receive an error rather than create a new
 * status." A pipeline stage renamed in the UI silently breaks the workflow that
 * writes it, unless the workflow writes `{"stage": [{"status": "<uuid>"}]}`
 * instead — which is what this action's output makes possible.
 *
 * Statuses carry two properties selects do not, and both are visible here:
 * `target_time_in_status` (the SLA for a stage) and `celebration_enabled`.
 */
const listStatuses: ActionDefinition<Input> = {
  key: "list-statuses",
  type: "read",
  resource: "attribute",
  title: "List Statuses",
  description:
    "The statuses of a status attribute — the stages of a pipeline — with each one's title and " +
    "UUID. Read before writing a stage: an unknown title is rejected, not created.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "select",
      required: true,
      default: "objects",
      options: optionsFrom(ATTRIBUTE_TARGETS),
      hint:
        "Whether the attribute is on an object or on a list. Status attributes are most often on " +
        "lists, where they model a pipeline.",
    },
    {
      key: "identifier",
      label: "Object or list",
      type: "string",
      required: true,
      placeholder: "deals",
      hint: "The `api_slug` or UUID of the object or list.",
    },
    {
      key: "attribute",
      label: "Attribute",
      type: "string",
      required: true,
      placeholder: "stage",
      hint: "Slug or UUID of the **status** attribute. List Attributes shows which are statuses.",
    },
    {
      key: "showArchived",
      label: "Include archived",
      type: "boolean",
      advanced: true,
      hint: "Archived statuses keep their historical values but can no longer be assigned.",
    },
  ],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    const { records } = await new AttioClient(ctx).list(
      `/${encodeURIComponent(input.target)}/${encodeURIComponent(input.identifier)}/attributes/${
        encodeURIComponent(input.attribute)
      }/statuses`,
      { query: compact({ show_archived: input.showArchived }) },
    );
    return { records };
  },
};

export default listStatuses;
