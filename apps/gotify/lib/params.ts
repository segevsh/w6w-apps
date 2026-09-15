import type { Param } from "@w6w/types";

/** Gotify's own paging ceiling — `limit` is bound `1..200` server-side. */
export const LIST_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    validation: { min: 1, max: 200, integer: true },
    hint: "Maximum messages to return (1-200). Gotify defaults to 100.",
  },
  {
    key: "since",
    label: "Since ID",
    type: "number",
    validation: { min: 0, integer: true },
    hint: "Return only messages with an id less than this — pass the previous page's " +
      "`paging.since` to page forward.",
  },
];

export const APPLICATION_ID_PARAM: Param = {
  key: "applicationId",
  label: "Application ID",
  type: "number",
  validation: { integer: true, min: 1 },
};
