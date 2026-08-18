import type { Param } from "@w6w/types";

/**
 * The three paging ids, which are not interchangeable.
 *
 * `max_id` pages backward. `since_id` and `min_id` both mean "newer than this"
 * and differ in which end they return when more arrived than the limit:
 * `since_id` gives the newest and drops the middle, `min_id` gives the oldest
 * so repeated calls walk forward without gaps.
 */
export const MAX_ID_PARAM: Param = {
  key: "maxId",
  label: "Older Than",
  type: "string",
  default: "",
  hint: "A status id — returns older ones. This is ordinary backward paging.",
};

export const MIN_ID_PARAM: Param = {
  key: "minId",
  label: "Newer Than",
  type: "string",
  default: "",
  hint: "A status id — returns the OLDEST newer ones, so repeated calls walk forward without " +
    "gaps. This is what 'everything since last run' wants; `since_id` drops the middle.",
};

export function limitParam(defaultLimit = 20, max = 40): Param {
  return {
    key: "limit",
    label: "Limit",
    type: "number",
    default: defaultLimit,
    hint: `Up to ${max} on most instances.`,
  };
}
