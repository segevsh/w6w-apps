import type { Param } from "@w6w/types";

/**
 * Vercel scopes a request to a Team with a `teamId` query param and defaults
 * to the token's own personal account when it is absent. The Connection
 * records which one it acts as; this param is the per-call override for a
 * token that belongs to several teams.
 */
export const TEAM_PARAM: Param = {
  key: "teamId",
  label: "Team ID",
  type: "string",
  default: "",
  placeholder: "team_abc123",
  hint: "Leave blank to use the team (or personal account) recorded on the connection.",
};

/** Project id or name, for the endpoints rooted at a project. */
export const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project ID or Name",
  type: "string",
  required: true,
  default: "",
  placeholder: "my-app",
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
