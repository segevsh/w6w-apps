import type { Param } from "@w6w/types";

/**
 * The contact identity pair.
 *
 * Loops keys a contact by `email` or `userId`, and most contact endpoints
 * accept either. Both are offered as plain optional fields, with the
 * "exactly one" rule enforced in `contactIdentity` rather than by marking one
 * required — marking `email` required would rule out the `userId`-keyed
 * workflows that exist precisely so an address can change.
 */
export const CONTACT_IDENTITY_PARAMS: Param[] = [
  {
    key: "email",
    label: "Email",
    type: "string",
    default: "",
    placeholder: "ada@example.com",
    hint: "Either this or a user id.",
  },
  {
    key: "userId",
    label: "User ID",
    type: "string",
    default: "",
    hint: "Your own id for this person. Required if you ever need to change their email address.",
  },
];

/** Custom contact properties, which live at the top level of the contact. */
export const CUSTOM_PROPERTIES_PARAM: Param = {
  key: "customProperties",
  label: "Custom Properties",
  type: "json",
  default: "",
  placeholder: '{"plan":"pro","seats":12,"trialing":false}',
  hint: "A JSON object of name → value. Strings, numbers and booleans only. The property must " +
    "already exist in Loops, or the contact write is rejected.",
};

/** The idempotency opt-in, shared by the two sending actions. */
export const IDEMPOTENCY_PARAM: Param = {
  key: "useInvocationIdempotencyKey",
  label: "Make Retries Safe",
  type: "boolean",
  default: false,
  hint: "Send this step's invocation id as Loops' `Idempotency-Key`, so a retry cannot send a " +
    "second copy. Reusing the key with a different body is refused by Loops with a 409.",
};

/** Cursor paging, shared by the list actions that support it. */
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
