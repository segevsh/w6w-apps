import type { Param } from "@w6w/types";

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result. Auth0's page size caps at 100.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/** The user an action works on. */
export const USER_ID_PARAM: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  required: true,
  default: "",
  placeholder: "auth0|65f1c2d3e4f5a6b7c8d9e0f1",
  hint: "Auth0's own id, including the connection prefix — `auth0|…`, `google-oauth2|…`, " +
    "`samlp|…`. Not the email.",
};
