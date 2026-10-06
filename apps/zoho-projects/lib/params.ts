import type { Param } from "@w6w/types";

export const portalId: Param = {
  key: "portalId",
  label: "Portal ID",
  type: "string",
  required: true,
  hint: "From the Portal List action (the `id` of a portal).",
};

export const projectId: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  hint: "From the Project List action.",
};

export const page: Param = {
  key: "page",
  label: "Page",
  type: "number",
  validation: { min: 1, integer: true },
  hint: "Page number, starting at 1 (default 1).",
};

export const perPage: Param = {
  key: "perPage",
  label: "Per Page",
  type: "number",
  validation: { min: 1, max: 200, integer: true },
  hint: "Records per page, 1-200 (default 100).",
};

export const sortBy: Param = {
  key: "sortBy",
  label: "Sort By",
  type: "string",
  hint: "`ASC(field_name)` or `DESC(field_name)`, e.g. `DESC(created_time)`.",
};

export const viewId: Param = {
  key: "viewId",
  label: "Custom View ID",
  type: "string",
  hint: "ID of a saved custom view whose filters should be applied.",
};
