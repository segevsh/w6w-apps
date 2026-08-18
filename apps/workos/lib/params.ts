import type { Param } from "@w6w/types";

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Follow the cursor to the end. WorkOS's page size caps at 100.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/**
 * The organization an action works on.
 *
 * An Organization is WorkOS's unit for one customer company — SSO connections,
 * directories, memberships and audit logs all hang off one.
 */
export const ORGANIZATION_PARAM: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  default: "",
  placeholder: "org_01EHZNVPK3SFK441A1RGBFSHRT",
  hint: "One customer company. `organization-list` maps names to ids.",
};
