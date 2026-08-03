import type { ActionDefinition } from "@w6w/types";
import {
  LemlistClient,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SORT_PARAMS,
  type SortInput,
  sortQuery,
} from "../lib/client.ts";

interface Input extends PageInput, SortInput {}

/**
 * `GET /schedules`.
 *
 * A schedule is the sending window a campaign runs in: `timezone`, `start` /
 * `end` times, `weekdays` (0–6), and `secondsToWait` between sends.
 *
 * Unlike the other list routes in this app, this one returns an **envelope**
 * (`{ schedules: [...] }`) rather than a bare array — lemlist's
 * `ScheduleListResponse`. The `output` reflects that.
 *
 * `page` and `offset` are alternatives, and lemlist states the precedence on
 * `offset`: "The number of records to skip. Used if `page` is not provided."
 */
const listSchedules: ActionDefinition<Input> = {
  key: "list-schedules",
  type: "search",
  resource: "schedule",
  title: "List Schedules",
  description:
    "List the team's sending schedules — timezone, start/end window, weekdays and the delay between sends.",
  params: [
    ...PAGE_PARAMS,
    ...SORT_PARAMS,
  ],
  output: [{ key: "schedules", type: "array", label: "Schedules" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request("/schedules", {
      query: { ...pageQuery(input), ...sortQuery(input) },
    });
  },
};

export default listSchedules;
