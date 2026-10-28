import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Zoho Mail actions. Every field, default and
 * allowed value here is copied from the vendor's own per-endpoint API
 * documentation (`https://www.zoho.com/mail/help/api/*.html`), verified live
 * 2026-08-15.
 */

/**
 * The mailbox account id. Optional on every action — see
 * `accountIdFrom` in `lib/client.ts` for the fallback to the connection's own
 * primary account, recorded by `afterConnect`.
 */
export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  hint: "Defaults to the connected mailbox. Only needed if this connection can see more than one " +
    "account (e.g. an admin) — use Get Accounts to list the available ids.",
};

export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder ID",
  type: "string",
  required: true,
  hint: "Use Get Folders to find a folder's id.",
};

export const messageIdParam: Param = {
  key: "messageId",
  label: "Message ID",
  type: "string",
  required: true,
  hint: "Take it from a List/Search Emails result.",
};

/** `start`/`limit`, shared by List Emails and Search Emails. Vendor max is 200; default 10. */
export function pageParams(defaultLimit = 10): Param[] {
  return [
    {
      key: "start",
      label: "Start",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-based sequence number of the first email to return.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: 200 },
      hint: "Maximum 200.",
    },
  ];
}

export const includeToParam: Param = {
  key: "includeto",
  label: "Include To details",
  type: "boolean",
  hint: "Off by default — the To addresses are omitted from each result unless this is turned on.",
};

/** Zoho's own message-status vocabulary for List Emails' `status` filter. */
export const messageStatusOptions = [
  { value: "read", label: "Read" },
  { value: "unread", label: "Unread" },
  { value: "all", label: "All (default)" },
];

/** `flagid` — the fixed flag vocabulary List Emails filters on. */
export const flagIdOptions = [
  { value: 0, label: "No flag" },
  { value: 1, label: "Info" },
  { value: 2, label: "Important" },
  { value: 3, label: "Follow up" },
];

export const sortByOptions = [
  { value: "date", label: "Date (default)" },
  { value: "messageId", label: "Message ID" },
  { value: "size", label: "Size" },
];
