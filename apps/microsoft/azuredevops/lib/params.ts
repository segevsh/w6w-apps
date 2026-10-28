import type { Param } from "@w6w/types";

/**
 * The project almost every path needs.
 *
 * Azure DevOps accepts a project's **name or its id** interchangeably, which is
 * convenient until a project is renamed and every workflow referencing it by
 * name breaks at once. The id does not change.
 */
export const PROJECT_PARAM: Param = {
  key: "project",
  label: "Project",
  type: "string",
  required: true,
  default: "",
  hint: "Name or id. The id survives a rename; the name does not, and every workflow using it " +
    "breaks together.",
};

/** `$top` / `$skip` paging, shared by the list actions. */
export const LIST_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    hint: "Azure DevOps calls this `$top`.",
  },
  {
    key: "skip",
    label: "Skip",
    type: "number",
    default: 0,
    advanced: true,
    hint: "`$skip` — offset paging. To read results 101-150, skip 100 and limit 50.",
  },
];
