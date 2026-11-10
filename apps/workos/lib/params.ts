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

/**
 * Creation-time order of a list, passed to WorkOS as `order` (`asc` | `desc`). Left empty, the
 * request carries no `order` and WorkOS applies its own default.
 */
export const ORDER_PARAM: Param = {
  key: "order",
  label: "Order",
  type: "select",
  default: "",
  advanced: true,
  options: [
    { value: "", label: "WorkOS default" },
    { value: "desc", label: "Newest first" },
    { value: "asc", label: "Oldest first" },
  ],
  hint: "Order by creation time. Leave empty for WorkOS's default.",
};
