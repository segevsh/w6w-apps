import type { Param } from "@w6w/types";

/**
 * The Events API's cursor model, which is unlike the rest of this pack.
 *
 * A request is **either** a starting query (`limit` plus a `start_time`, or a
 * `reset_cursor`) **or** a continuation (`cursor` alone, nothing else). Sending
 * both is an error, and sending a cursor with a changed filter silently ignores
 * the filter — the cursor already encodes it.
 *
 * `has_more` is what says whether to keep going, and it is not the same as
 * `cursor` being present: the cursor is *always* present, so a loop that
 * continues while a cursor exists never terminates. That is the trap, and it is
 * why every action here returns `hasMore` as its own field.
 */

export const CURSOR_PARAM: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  default: "",
  hint: "The `cursor` from a previous page. When given, every other filter is ignored — the " +
    "cursor already carries them.",
};

export const LIMIT_PARAM: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 100,
  hint: "1 to 1000, per page.",
};

export const START_TIME_PARAM: Param = {
  key: "startTime",
  label: "From",
  type: "string",
  default: "",
  hint: "RFC 3339, e.g. `2026-08-18T00:00:00Z`. Defaults to a starting cursor at the earliest " +
    "available point, which for a busy account is a great many pages.",
};

export const END_TIME_PARAM: Param = {
  key: "endTime",
  label: "To",
  type: "string",
  default: "",
  hint: "RFC 3339.",
};

/** Build the body: a continuation, or a starting query — never both. */
export function eventsBody(
  cursor: string,
  limit: number,
  startTime: string,
  endTime: string,
): Record<string, unknown> {
  // A cursor request carries nothing else; the cursor encodes the filter.
  if (cursor) return { cursor };
  const body: Record<string, unknown> = { limit: Math.min(1000, Math.max(1, limit)) };
  if (startTime) body.start_time = startTime;
  if (endTime) body.end_time = endTime;
  // With no window at all the API needs to be told where to begin.
  if (!startTime) body.reset_cursor = true;
  return body;
}
