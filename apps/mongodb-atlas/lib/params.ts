import type { Param } from "@w6w/types";

/**
 * Parameters shared across the project-scoped actions.
 *
 * Everything below the organisation is addressed by **project id** — a
 * 24-character hex ObjectId that Atlas calls `groupId` in every path while the
 * interface calls it a project. There is no name-based path: `project-list`
 * resolves a name to an id, and the id is what everything else takes.
 */
export const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  default: "",
  placeholder: "5f8d0d55b54eff0f2b2c3d4e",
  hint: "The 24-character hex id from the console URL — Atlas calls this a `groupId` in its " +
    "paths. `project-list` finds it from a name.",
};

/** The cluster name, which is the identifier — there is no separate id in paths. */
export const CLUSTER_PARAM: Param = {
  key: "cluster",
  label: "Cluster Name",
  type: "string",
  required: true,
  default: "",
  hint: "The name is the identifier here, and it cannot be changed after creation.",
};

/** Atlas paginates everything with these two, one-indexed. */
export const PAGE_PARAMS: Param[] = [
  {
    key: "itemsPerPage",
    label: "Page Size",
    type: "number",
    default: 100,
    hint: "Up to 500.",
  },
  {
    key: "pageNum",
    label: "Page",
    type: "number",
    default: 1,
    hint: "One-indexed.",
  },
];
