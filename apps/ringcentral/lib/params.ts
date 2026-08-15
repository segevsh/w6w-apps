import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the RingCentral actions.
 *
 * Every enum here is transcribed from RingCentral's OpenAPI 3.1 document
 * (fetched 2026-08-15 from
 * `netstorage.ringcentral.com/dpw/api-reference/specs/rc-platform.yml`), not
 * inferred.
 */

/**
 * `accountId` path segment. Defaults to `"~"` — the vendor's own shorthand for
 * "the account associated with the current authorization session" — which is
 * correct for every ordinary connection. A real numeric id is only useful for
 * a multi-account partner/admin credential.
 */
export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  default: "~",
  hint: 'Internal RingCentral account identifier. Leave as "~" for the connection\'s own account.',
};

/**
 * `extensionId` path segment. Defaults to `"~"` — "the extension associated
 * with the current authorization session". A real id reads another user's
 * data and requires the connection to hold account-admin permissions.
 */
export const extensionIdParam: Param = {
  key: "extensionId",
  label: "Extension ID",
  type: "string",
  default: "~",
  hint:
    'Internal RingCentral extension identifier. Leave as "~" for the connection\'s own extension. ' +
    "A different id reads that extension's data and requires an account-admin connection.",
};

/** The page/perPage pair every list endpoint in this app uses. */
export function paginationParams(defaultPerPage: number, hint: string): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-indexed page number.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: defaultPerPage,
      validation: { integer: true, min: 1 },
      hint,
    },
  ];
}

/** `dateFrom`/`dateTo`, shared by call-log and message-store list filters. */
export function dateRangeParams(defaultsHint: string): Param[] {
  return [
    {
      key: "dateFrom",
      label: "From",
      type: "datetime",
      hint: `ISO 8601 including timezone, e.g. 2026-08-01T00:00:00.000Z. ${defaultsHint}`,
    },
    {
      key: "dateTo",
      label: "To",
      type: "datetime",
      hint: "ISO 8601 including timezone. Defaults to the current time.",
    },
  ];
}

/** `CallDirectionEnum`. */
export const callDirectionOptions = [
  { value: "Inbound", label: "Inbound" },
  { value: "Outbound", label: "Outbound" },
];

/** `CallTypeEnum` — the call-log `type` filter (not to be confused with `CallActionEnum`). */
export const callTypeOptions = [
  { value: "Voice", label: "Voice" },
  { value: "Fax", label: "Fax" },
];

/** `CallLogView` — level of detail returned per record. */
export const callLogViewOptions = [
  { value: "Simple", label: "Simple (default)" },
  { value: "Detailed", label: "Detailed — includes per-leg records" },
];

/** `MessageTypeEnum`. */
export const messageTypeOptions = [
  { value: "Fax", label: "Fax" },
  { value: "SMS", label: "SMS" },
  { value: "VoiceMail", label: "Voicemail" },
  { value: "Pager", label: "Pager (internal Company/Text message)" },
  { value: "Text", label: "Text" },
];

/** `MessageDirectionEnum`. */
export const messageDirectionOptions = [
  { value: "Inbound", label: "Inbound" },
  { value: "Outbound", label: "Outbound" },
];

/** `MessageAvailabilityEnum`. */
export const messageAvailabilityOptions = [
  { value: "Alive", label: "Alive" },
  { value: "Deleted", label: "Deleted — still restorable" },
  { value: "Purged", label: "Purged" },
];

/** `MessageReadStatusEnum`. */
export const messageReadStatusOptions = [
  { value: "Read", label: "Read" },
  { value: "Unread", label: "Unread" },
];

/** Extension `status` filter values from `GET /extension`. */
export const extensionStatusOptions = [
  { value: "Enabled", label: "Enabled" },
  { value: "Disabled", label: "Disabled" },
  { value: "NotActivated", label: "Not activated" },
  { value: "Unassigned", label: "Unassigned — no extensionNumber" },
];

/** Extension `type` filter values from `GET /extension`. Trimmed to the types most workflows filter by. */
export const extensionTypeOptions = [
  { value: "User", label: "User" },
  { value: "FaxUser", label: "Fax user" },
  { value: "VirtualUser", label: "Virtual user" },
  { value: "DigitalUser", label: "Digital user" },
  { value: "Department", label: "Call queue (legacy name: Department)" },
  { value: "Announcement", label: "Announcement-only" },
  { value: "Voicemail", label: "Take-messages-only (voicemail)" },
  { value: "IvrMenu", label: "IVR menu" },
  { value: "Site", label: "Site" },
  { value: "Bot", label: "Bot" },
];

/** `GET /phone-number` `usageType` filter — the values most connections actually hold. */
export const phoneNumberUsageTypeOptions = [
  { value: "MainCompanyNumber", label: "Main company number" },
  { value: "AdditionalCompanyNumber", label: "Additional company number" },
  { value: "DirectNumber", label: "Direct (extension) number" },
  { value: "CompanyFaxNumber", label: "Company fax number" },
  { value: "ForwardedNumber", label: "Forwarded number" },
  { value: "ContactCenterNumber", label: "Contact center number" },
];

/** `GET /phone-number` `status` filter. */
export const phoneNumberStatusOptions = [
  { value: "Normal", label: "Normal — ready to use" },
  { value: "Pending", label: "Pending" },
  { value: "PortedIn", label: "Ported in" },
  { value: "Temporary", label: "Temporary" },
];

/** Company Directory `type` filter — `SearchDirectoryExtensionType`. */
export const directoryEntryTypeOptions = [
  { value: "User", label: "User" },
  { value: "Department", label: "Call queue (legacy name: Department)" },
  { value: "Announcement", label: "Announcement-only" },
  { value: "Voicemail", label: "Take-messages-only (voicemail)" },
  { value: "IvrMenu", label: "IVR menu" },
  { value: "Limited", label: "Limited extension" },
  { value: "External", label: "External" },
];

/** A phone number in E.164 format, the shape every RingCentral caller/recipient field takes. */
export function phoneNumberParam(key: string, label: string, required = false): Param {
  return {
    key,
    label,
    type: "string",
    required,
    placeholder: "+15555550100",
    hint: "Phone number in E.164 format.",
  };
}
