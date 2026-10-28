import type { Param } from "@w6w/types";

/**
 * The Google Cloud project. It is what gets **billed** for a query, which is
 * not always the project that owns the data — so it is collected once on the
 * Connection and overridable per call.
 */
export const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  default: "",
  placeholder: "my-gcp-project",
  hint: "Leave blank to use the project on the connection. This is the project that is billed.",
};

/** The dataset, for the resources nested under one. */
export const DATASET_PARAM: Param = {
  key: "datasetId",
  label: "Dataset ID",
  type: "string",
  default: "",
  hint: "Leave blank to use the default dataset on the connection.",
};

/** The two params every list action shares. */
export const LIST_PARAMS: Param[] = [
  { key: "returnAll", label: "Return All", type: "boolean", default: false },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Max number of results when Return All is off.",
  },
];
