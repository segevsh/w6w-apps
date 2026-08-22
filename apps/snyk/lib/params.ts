import type { Param } from "@w6w/types";

/**
 * Most of Snyk's surface is organization-scoped and the id is a UUID, so it is
 * collected once at connect time. This param is the per-call override, for a
 * token that reaches several orgs.
 */
export const ORG_PARAM: Param = {
  key: "orgId",
  label: "Organization ID",
  type: "string",
  default: "",
  placeholder: "4a18d42f-0706-4ad0-b127-24078731fbed",
  hint: "Leave blank to use the organization recorded on the connection.",
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
