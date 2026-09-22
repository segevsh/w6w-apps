import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the HeyReach actions.
 *
 * Every label, type and bound here mirrors the parameter list in HeyReach's own
 * OpenAPI 3.1 document (`https://docs.heyreach.io/openapi.json`, read in full
 * 2026-09-22) plus the prose each operation carries in its own `description`
 * field. Where the document's machine-readable schema is a generator artifact
 * — every request body lists every property as `required`, including the ones
 * its own prose calls optional — the prose wins, and the note says so.
 */

/**
 * The `offset`/`limit` pair HeyReach's list bodies share.
 *
 * Both are body fields, not query parameters: `POST /api/public/<resource>/GetAll`
 * takes `{ offset, limit, ...filters }`. `offset` is defaulted to `0` and sent
 * explicitly, because the body is the only place the API can read it from.
 */
export function paginationParams(defaultLimit: number, limitHint: string): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1 },
      hint: limitHint,
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Zero-based index of the first record to return.",
    },
  ];
}

/** `accountId` — a sender LinkedIn account. */
export const accountIdParam: Param = {
  key: "accountId",
  label: "LinkedIn account",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The `id` of a sender account, from List LinkedIn Accounts.",
};

/** `listId` — a lead or company list. */
export const listIdParam: Param = {
  key: "listId",
  label: "List",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The `id` of a lead or company list, from List Lists or Create List.",
};

/** `campaignId`. */
export const campaignIdParam: Param = {
  key: "campaignId",
  label: "Campaign",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The `id` of a campaign, from List Campaigns.",
};

/** `webhookId`. */
export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The `id` of a webhook, from List Webhooks.",
};

/** `profileUrl` — how a lead is addressed on almost every lead endpoint. */
export const profileUrlParam: Param = {
  key: "profileUrl",
  label: "LinkedIn profile URL",
  type: "string",
  required: true,
  placeholder: "https://www.linkedin.com/in/john-doe/",
  hint: "The lead's LinkedIn profile URL. Sales Navigator URLs (`linkedin.com/sales/...`) are " +
    "accepted by the lead endpoints too.",
};

/** A list of integer ids, as HeyReach's filter bodies take them. */
export function numberListParam(key: string, label: string, hint: string): Param {
  return {
    key,
    label,
    type: "array",
    item: { type: "number" },
    hint,
  };
}

/**
 * The lead object HeyReach's import endpoints share —
 * `list/AddLeadsToListV2` and `campaign/AddLeadsToCampaignV2` declare the
 * identical shape, so it is declared once here.
 *
 * The document lists **every** one of these fields in `required` (the same
 * generator artifact that marks `keyword` required on the list endpoints), and
 * its own prose says nothing about which are truly mandatory. `profileUrl` is
 * the one this app requires: it is the identity every other lead endpoint
 * addresses a lead by, and the two import endpoints resolve the lead from it.
 *
 * `customUserFields[].name` must be alphanumeric or underscore — HeyReach
 * rejects the whole import otherwise — which the hint says.
 */
export function leadFields(): Param[] {
  return [
    {
      key: "profileUrl",
      label: "LinkedIn profile URL",
      type: "string",
      required: true,
      placeholder: "https://www.linkedin.com/in/john-doe/",
      hint: "How HeyReach identifies the lead. Sales Navigator URLs are accepted too.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company", type: "string" },
    { key: "position", label: "Position", type: "string" },
    { key: "location", label: "Location", type: "string" },
    { key: "emailAddress", label: "Email address", type: "string" },
    {
      key: "summary",
      label: "Summary",
      type: "text",
      hint: "Short free-text note about the lead.",
    },
    { key: "about", label: "About", type: "text", hint: "The lead's LinkedIn About section." },
    {
      key: "customUserFields",
      label: "Custom fields",
      type: "array",
      item: {
        type: "object",
        fields: [
          {
            key: "name",
            label: "Name",
            type: "string",
            required: true,
            hint: "Letters, digits and underscores only — HeyReach rejects anything else.",
          },
          { key: "value", label: "Value", type: "string", required: true },
        ],
      },
      hint: "HeyReach custom fields. Names must be alphanumeric or underscore, or the whole " +
        "import is rejected.",
    },
  ];
}

/** `linkedin_id` — the member id HeyReach holds for a lead. */
export const linkedInIdParam: Param = {
  key: "leadLinkedInId",
  label: "LinkedIn member ID",
  type: "string",
  hint: "The `linkedin_id` HeyReach holds for this lead — returned by Get Lead and by many " +
    "list responses.",
};
