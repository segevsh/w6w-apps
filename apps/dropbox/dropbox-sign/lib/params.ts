import type { Param } from "@w6w/types";

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result. Off, only the first `limit` are returned.",
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

/**
 * The account whose objects to act on.
 *
 * Dropbox Sign scopes most reads to the API key's own account unless an
 * `account_id` is named; `all` widens a list to the whole team. Left blank it
 * behaves exactly as the API does by default, so this never changes a call's
 * meaning by being present.
 */
export const ACCOUNT_ID_PARAM: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  default: "",
  placeholder: "all",
  hint: "Whose objects to list. A team member's account id, or `all` for the whole team. " +
    "Blank means this connection's own account.",
};

/**
 * **The one parameter worth reading twice.**
 *
 * `test_mode` decides whether the thing you just created is a real, legally
 * binding signature request or a rehearsal. Dropbox Sign's own schema defaults
 * it to `false`, and this app keeps that default rather than choosing a safer
 * one — flipping it would mean a workflow that looks like it is sending
 * contracts quietly sends nothing binding, which is the worse of the two
 * surprises and the harder one to notice.
 *
 * So the default matches the API, and the label says what the default does.
 */
export const TEST_MODE_PARAM: Param = {
  key: "testMode",
  label: "Test Mode (off = legally binding)",
  type: "boolean",
  default: false,
  hint: "OFF sends a real, legally binding request and consumes plan quota. ON creates a " +
    "non-binding rehearsal. Dropbox Sign's default is off; this app does not override it.",
};

/** The `signers` array, shared by the send paths. */
export function signersParam(byRole: boolean): Param {
  return {
    key: "signers",
    label: "Signers",
    type: "json",
    required: true,
    default: "",
    placeholder: byRole
      ? '[{"role":"Client","email_address":"ada@example.com","name":"Ada Lovelace"}]'
      : '[{"email_address":"ada@example.com","name":"Ada Lovelace","order":0}]',
    hint: byRole
      ? "One object per template role. Each needs `role`, `email_address` and `name` — a " +
        "template identifies its signers by role, and an `order` here is ignored."
      : "Each needs `email_address` and `name`. Add `order` to sign in sequence; omit it and " +
        "everyone signs at once.",
  };
}

/** `file_urls`, shared by everything that takes a document. */
export const FILE_URLS_PARAM: Param = {
  key: "fileUrls",
  label: "File URLs",
  type: "string",
  default: "",
  placeholder: "https://example.com/contract.pdf",
  hint: "Comma-separated public URLs Dropbox Sign will download. This app sends documents by " +
    "URL rather than uploading bytes — see the app README.",
};
