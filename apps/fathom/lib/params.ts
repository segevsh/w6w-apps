/**
 * Params and option vocabularies shared across Fathom's endpoints.
 *
 * Every enum here is copied from Fathom's OpenAPI document
 * (`https://developers.fathom.ai/api-reference/openapi.yaml`, fetched
 * 2026-08-03) rather than inferred — none of these values are guesses.
 */
import type { Param } from "@w6w/types";

/**
 * Fathom paginates with an opaque cursor and nothing else: no offset, no page
 * size. `next_cursor` from one page is the `cursor` of the next; it is `null`
 * on the last page.
 */
export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Opaque cursor from a previous page's `nextCursor`. Leave empty for the first page.",
};

/** Filter by team name — accepted by `/team_members` and `/users`. */
export const teamParam: Param = {
  key: "team",
  label: "Team",
  type: "string",
  hint: "Team name to filter by. Names come from Get Many Teams.",
};

/** The `output` block every cursor-paginated list action declares. */
export const listOutput = [
  { key: "items", type: "array" as const, label: "Results" },
  {
    key: "nextCursor",
    type: "string" as const,
    label: "Cursor for the next page (null on the last page)",
  },
  { key: "limit", type: "number" as const, label: "Page size Fathom applied" },
];

/** `triggered_for` on a webhook — which recordings fire it. */
export const TRIGGERED_FOR = [
  "my_recordings",
  "shared_external_recordings",
  "my_shared_with_team_recordings",
  "shared_team_recordings",
] as const;

export const triggeredForOptions = [
  {
    value: "my_recordings",
    label: "My recordings (private, and shared with individuals)",
  },
  {
    value: "shared_external_recordings",
    label: "Recordings shared with me by users outside my Team Plan",
  },
  {
    value: "my_shared_with_team_recordings",
    label: "My recordings shared with a team (Team Plans only)",
  },
  {
    value: "shared_team_recordings",
    label: "Recordings from other users on my Team Plan (Team Plans only)",
  },
];

/** `calendar_invitees_domains_type` on `GET /meetings`. */
export const inviteeDomainsTypeOptions = [
  { value: "all", label: "All meetings" },
  { value: "only_internal", label: "Internal only (no external invitees)" },
  { value: "one_or_more_external", label: "At least one external invitee" },
];

/** `status` on `GET /users`. */
export const userStatusOptions = [
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
  { value: "invited", label: "Invited (no permissions object yet)" },
];

/** `settings_access` on `GET /users`. */
export const settingsAccessOptions = [
  { value: "none", label: "None" },
  { value: "team_admin", label: "Team admin" },
  { value: "account_admin", label: "Account admin" },
];

/**
 * `destination_url` on the summary, transcript and download endpoints.
 *
 * These three endpoints have two modes: send `destination_url` and Fathom POSTs
 * the payload there asynchronously, returning only `{ destination_url }`; omit
 * it and the data comes back inline. Omitting it is the useful mode inside a
 * workflow step, so it has no default.
 */
export const destinationUrlParam: Param = {
  key: "destinationUrl",
  label: "Destination URL",
  type: "string",
  hint: "Optional. If set, Fathom POSTs the payload to this URL instead of returning it, and the " +
    "action returns just the destination. Leave empty to get the data inline.",
  placeholder: "https://example.com/destination",
};

/** `recording_id` — the integer id carried on every meeting as `recording_id`. */
export const recordingIdParam: Param = {
  key: "recordingId",
  label: "Recording ID",
  type: "number",
  required: true,
  hint: "The `recording_id` field on a meeting. Get IDs from Get Many Meetings.",
  validation: { integer: true },
};
