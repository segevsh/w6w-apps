import type { Param } from "@w6w/types";

/** Paging, shared by every list action. dbt caps a page at 100 rows. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page to the end. dbt caps each page at 100 rows however large a limit is sent.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/** The project a v3 object belongs to. */
export const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  default: "",
  hint: "`project-list` maps names to ids.",
};
