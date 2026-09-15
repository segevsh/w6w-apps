import type { Param } from "@w6w/types";

/** `limit`/`offset` paging, shared by every array-shaped list action. Clerk caps `limit` at 500. */
export const LIST_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 10,
    hint: "Clerk's own cap is 500 per page.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    default: 0,
  },
];

export const USER_ID_PARAM: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  required: true,
  default: "",
  placeholder: "user_2abc123",
};

export const ORGANIZATION_ID_PARAM: Param = {
  key: "organizationId",
  label: "Organization ID or slug",
  type: "string",
  required: true,
  default: "",
  placeholder: "org_2abc123",
  hint: "Clerk accepts either the organization's ID or its slug here.",
};
