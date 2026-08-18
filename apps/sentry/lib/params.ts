import type { Param } from "@w6w/types";

/**
 * Almost every Sentry endpoint is organization-scoped, and the slug is fixed
 * for the life of a Connection — so it is collected once at connect time and
 * published to `connection.display`. This param is the per-call override, for
 * a token that can see more than one organization.
 */
export const ORG_PARAM: Param = {
  key: "organizationSlug",
  label: "Organization Slug",
  type: "string",
  default: "",
  placeholder: "acme",
  hint: "Leave blank to use the organization recorded on the connection.",
};

/** Project slug, for the endpoints rooted at `/projects/{org}/{project}/`. */
export const PROJECT_PARAM: Param = {
  key: "projectSlug",
  label: "Project Slug",
  type: "string",
  required: true,
  default: "",
  placeholder: "backend",
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
