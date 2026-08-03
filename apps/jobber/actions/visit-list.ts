import type { ActionDefinition } from "@w6w/types";
import {
  csv,
  dateRange,
  JobberClient,
  optionalInput,
  PAGE_INFO,
  sortInput,
  VISIT_FIELDS,
} from "../lib/client.ts";

interface Input {
  jobIds?: string;
  assignedTo?: string;
  status?: string;
  isComplete?: boolean;
  startAfter?: string;
  startBefore?: string;
  timezone?: string;
  sortKey?: string;
  sortDirection?: string;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListVisits(
    $filter: VisitFilterAttributes
    $sort: [VisitsSortInput!]
    $timezone: Timezone
    $first: Int
    $after: String
  ) {
    visits(filter: $filter, sort: $sort, timezone: $timezone, first: $first, after: $after) {
      nodes { ${VISIT_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

/**
 * Visits are the schedule — the individual appointments a job is made of — so
 * this is the action a dispatch or routing workflow reads.
 *
 * Two things are easy to get wrong here:
 *
 *   - **An unscheduled visit has `startAt` and `endAt` both null.** Jobber says
 *     so on the field itself. A date-window filter therefore cannot return
 *     unscheduled work, and code that sorts on `startAt` has to tolerate nulls.
 *   - **`timezone` is not cosmetic.** `Visit.visitStatus` takes an optional
 *     timezone argument, and the whole `TODAY` / `LATE` / `UPCOMING` vocabulary
 *     is relative to a day boundary. Passing an IANA zone (`America/Denver`)
 *     makes "today" mean the account's today rather than UTC's.
 */
const visitList: ActionDefinition<Input> = {
  key: "visit-list",
  type: "search",
  resource: "visit",
  title: "List Visits",
  description:
    "List scheduled visits, filtered by job, assignee, status or date window. Default sort is start time ascending.",
  params: [
    {
      key: "jobIds",
      label: "Job IDs",
      type: "string",
      hint: "Comma-separated EncodedIds. Restricts to visits on those jobs.",
    },
    { key: "assignedTo", label: "Assigned user ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "TODAY", label: "Today" },
        { value: "UPCOMING", label: "Upcoming" },
        { value: "LATE", label: "Late" },
        { value: "UNSCHEDULED", label: "Unscheduled" },
        { value: "COMPLETED", label: "Completed" },
      ],
      hint: "Upper-case here, unlike the quote and job status enums. Jobber's own inconsistency.",
    },
    { key: "isComplete", label: "Completed", type: "boolean", advanced: true },
    {
      key: "startAfter",
      label: "Starts after",
      type: "datetime",
      hint: "Unscheduled visits have a null start and match no date window.",
      row: "win",
    },
    { key: "startBefore", label: "Starts before", type: "datetime", row: "win" },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      placeholder: "America/Denver",
      hint: "IANA zone. Decides what TODAY, LATE and UPCOMING mean.",
      advanced: true,
    },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "START_AT", label: "Start at" },
        { value: "CREATED_AT", label: "Created at" },
        { value: "STATUS", label: "Status" },
        { value: "CLIENT_PRIMARY_NAME", label: "Client primary name" },
      ],
      advanced: true,
      row: "sort",
    },
    {
      key: "sortDirection",
      label: "Direction",
      type: "select",
      default: "ASCENDING",
      options: [
        { value: "ASCENDING", label: "Ascending" },
        { value: "DESCENDING", label: "Descending" },
      ],
      advanced: true,
      row: "sort",
    },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "after", label: "Cursor", type: "string" },
  ],
  output: [{ key: "visits", type: "object", label: "Page of visits with pageInfo" }],

  execute(input, ctx) {
    // Ascending, not `sortInput`'s DESCENDING fallback: for a schedule, "next
    // first" is the only sensible default, and it is what the param declares.
    const sort = sortInput(input.sortKey, input.sortDirection ?? "ASCENDING");
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({
        jobIds: csv(input.jobIds),
        assignedTo: input.assignedTo,
        status: input.status,
        isComplete: input.isComplete,
        startAt: dateRange(input.startAfter, input.startBefore),
      }),
      sort: sort ? [sort] : undefined,
      timezone: input.timezone,
      first: input.first ?? 25,
      after: input.after,
    });
  },
};

export default visitList;
