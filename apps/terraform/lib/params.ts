import type { Param } from "@w6w/types";

/**
 * Parameters shared across the workspace and run actions.
 *
 * A workspace is addressable two ways — by its opaque `ws-…` id, or by
 * organisation plus name — and both are common. Ids are what other API
 * responses hand back; names are what a person types and what appears in the
 * URL of the web interface. Every workspace action here takes either.
 */
export const WORKSPACE_ID_PARAM: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  default: "",
  placeholder: "ws-XXXXXXXXXXXXXXXX",
  hint: "Either this, or the organisation and name below.",
};

export const ORGANIZATION_PARAM: Param = {
  key: "organization",
  label: "Organization",
  type: "string",
  default: "",
  hint: "With Workspace Name, an alternative to the id.",
};

export const WORKSPACE_NAME_PARAM: Param = {
  key: "workspace",
  label: "Workspace Name",
  type: "string",
  default: "",
  hint: "With Organization, an alternative to the id.",
};

/** The three together, in the order the actions present them. */
export const WORKSPACE_PARAMS: Param[] = [
  WORKSPACE_ID_PARAM,
  ORGANIZATION_PARAM,
  WORKSPACE_NAME_PARAM,
];
