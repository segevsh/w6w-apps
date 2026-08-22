import type { Param } from "@w6w/types";

/**
 * The repository an action works on.
 *
 * Written as `name` when the connection has a default owner, or as
 * `owner/name` — which is how people write it everywhere else, so both are
 * accepted rather than forcing two fields.
 */
export const REPO_PARAM: Param = {
  key: "repo",
  label: "Repository",
  type: "string",
  required: true,
  default: "",
  placeholder: "acme/web",
  hint: "`owner/name`, or just `name` when the connection has a default owner.",
};

/** The owner override, for when the repository was given as a bare name. */
export const OWNER_PARAM: Param = {
  key: "owner",
  label: "Owner",
  type: "string",
  default: "",
  hint: "Only needed when the repository is a bare name and the connection has no default owner.",
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
    hint: "Maximum results when Return All is off. Gitea's page maximum is usually 50.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];
