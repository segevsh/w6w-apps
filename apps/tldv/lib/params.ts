import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the tl;dv actions.
 *
 * Every shape here is copied from the vendor's OpenAPI document (the
 * `__redoc_state.spec.data` embedded at `https://doc.tldv.io/`, fetched
 * 2026-08-16), not inferred.
 */

/**
 * `meetingId` — the path segment every per-meeting endpoint takes.
 *
 * The vendor's own pattern for the segment is permissive
 * (`[^\/#\?]+?` — "anything but a slash, hash or question mark"), but
 * `download`'s dedicated params schema pins it to a Mongo ObjectId
 * (`^[0-9a-fA-F]{24}$`). Meeting ids observed in the docs' own examples
 * (`653663ac7c8dbd00130f11d9`) match that narrower shape, so it is stated in
 * the hint as what to expect even though the field itself accepts any string.
 */
export const meetingIdParam: Param = {
  key: "meetingId",
  label: "Meeting",
  type: "string",
  required: true,
  placeholder: "653663ac7c8dbd00130f11d9",
  hint: "The meeting's id, e.g. from meeting-list's output or the tldv.io meeting URL.",
};

/** `GetMeetingsQueryParams.meetingType`. */
export const meetingTypeOptions = [
  { value: "internal", label: "Internal — every participant is from your organization" },
  { value: "external", label: "External — at least one participant is from outside it" },
];
