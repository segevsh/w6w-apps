import type { Param } from "@w6w/types";

/**
 * The `access_token` identifying one **Item** — one user's connection to one
 * financial institution.
 *
 * It is a param rather than a connection field because one Plaid connection
 * fans out over every Item the application has ever created: the credential
 * belongs to the integration, the access token belongs to a person.
 *
 * It is `type: "secret"` because that is what it is — anyone holding one can
 * read that person's balances and transactions until the Item is removed.
 */
export const ACCESS_TOKEN_PARAM: Param = {
  key: "accessToken",
  label: "Access Token",
  type: "secret",
  required: true,
  hint: "The Item's `access_token`, from exchanging a public token. It identifies ONE user's " +
    "bank connection and is a long-lived secret — store it accordingly.",
};

/** Restrict a call to particular accounts within an Item. */
export const ACCOUNT_IDS_PARAM: Param = {
  key: "accountIds",
  label: "Account IDs",
  type: "string",
  default: "",
  advanced: true,
  hint: "Comma-separated. Empty covers every account on the Item.",
};
