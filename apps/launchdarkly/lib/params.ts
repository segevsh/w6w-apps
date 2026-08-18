import type { Param } from "@w6w/types";

/** The project an action works in. */
export const PROJECT_PARAM: Param = {
  key: "projectKey",
  label: "Project",
  type: "string",
  default: "",
  placeholder: "default",
  hint: "Falls back to the connection's default project when blank.",
};

/**
 * The environment an action works in.
 *
 * Its own parameter rather than folded into the project, because the failure
 * modes are different: a wrong project is a 404, while a wrong environment
 * succeeds against the wrong one.
 */
export const ENVIRONMENT_PARAM: Param = {
  key: "environmentKey",
  label: "Environment",
  type: "string",
  default: "",
  placeholder: "production",
  hint: "Falls back to the connection's default. A flag exists in EVERY environment, so the " +
    "wrong one here succeeds against the wrong one.",
};

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Maximum results when Return All is off.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];
