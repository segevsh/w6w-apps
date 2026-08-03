import type { ActionDefinition } from "@w6w/types";
import {
  csv,
  dateRange,
  JOB_FIELDS,
  JobberClient,
  optionalInput,
  PAGE_INFO,
  sortInput,
} from "../lib/client.ts";

interface Input {
  status?: string;
  jobType?: string;
  ids?: string;
  visitsAssignedToUserId?: string;
  visitsScheduledAfter?: string;
  visitsScheduledBefore?: string;
  includeUnscheduled?: boolean;
  onlyInvoiceable?: boolean;
  searchTerm?: string;
  sortKey?: string;
  sortDirection?: string;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListJobs(
    $filter: JobFilterAttributes
    $searchTerm: String
    $sort: [JobsSortInput!]
    $first: Int
    $after: String
  ) {
    jobs(filter: $filter, searchTerm: $searchTerm, sort: $sort, first: $first, after: $after) {
      nodes { ${JOB_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

/**
 * `JobStatusTypeEnum` is not a lifecycle. It mixes true states (`active`,
 * `archived`, `on_hold`) with scheduling *views* (`today`, `upcoming`, `late`,
 * `unscheduled`) and with work queues (`requires_invoicing`,
 * `action_required`). A job that is active and scheduled for today matches
 * several of them, and the filter takes exactly one — so "status" here means
 * "which of Jobber's dashboard buckets", not "what state is this job in".
 * `Job.jobStatus` on a returned node reports the same vocabulary.
 */
const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description:
    "List jobs by Jobber's dashboard bucket, type, scheduling window or assignee. One cursor page per call.",
  params: [
    {
      key: "status",
      label: "Status bucket",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "today", label: "Today" },
        { value: "upcoming", label: "Upcoming" },
        { value: "late", label: "Late" },
        { value: "unscheduled", label: "Unscheduled" },
        { value: "on_hold", label: "On hold" },
        { value: "action_required", label: "Action required" },
        { value: "requires_invoicing", label: "Requires invoicing" },
        { value: "expiring_within_30_days", label: "Expiring within 30 days" },
        { value: "archived", label: "Archived" },
      ],
      hint: "Overlapping buckets, not exclusive states — see the app README.",
    },
    {
      key: "jobType",
      label: "Type",
      type: "select",
      options: [
        { value: "ONE_OFF", label: "One-off" },
        { value: "RECURRING", label: "Recurring" },
      ],
    },
    {
      key: "visitsScheduledAfter",
      label: "Visits scheduled after",
      type: "datetime",
      hint: "Matches jobs with a visit starting inside this window. The scheduling filter.",
      row: "sched",
    },
    {
      key: "visitsScheduledBefore",
      label: "Visits scheduled before",
      type: "datetime",
      row: "sched",
    },
    {
      key: "visitsAssignedToUserId",
      label: "Visits assigned to user ID",
      type: "string",
      hint:
        "Combined with the window above, matches jobs where the SAME visit is both assigned to that user and inside the window.",
    },
    {
      key: "includeUnscheduled",
      label: "Include unscheduled",
      type: "boolean",
      advanced: true,
    },
    {
      key: "onlyInvoiceable",
      label: "Only invoiceable",
      type: "boolean",
      hint: "Jobs that can generate an invoice, including jobs with no line items.",
      advanced: true,
    },
    {
      key: "ids",
      label: "Job IDs",
      type: "string",
      hint: "Comma-separated EncodedIds. A batch fetch without one query per id.",
      advanced: true,
    },
    { key: "searchTerm", label: "Search", type: "string" },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "UPDATED_AT", label: "Updated at" },
        { value: "JOB_NUMBER", label: "Job number" },
        { value: "JOB_STATUS", label: "Status" },
        { value: "TOTAL_COST", label: "Total cost" },
        { value: "SCHEDULE", label: "Schedule" },
        { value: "VISIT_START_DATE", label: "Visit start date" },
        { value: "CLIENT_PRIMARY_NAME", label: "Client primary name" },
      ],
      advanced: true,
      row: "sort",
    },
    {
      key: "sortDirection",
      label: "Direction",
      type: "select",
      default: "DESCENDING",
      options: [
        { value: "DESCENDING", label: "Descending" },
        { value: "ASCENDING", label: "Ascending" },
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
  output: [{ key: "jobs", type: "object", label: "Page of jobs with pageInfo" }],

  execute(input, ctx) {
    const sort = sortInput(input.sortKey, input.sortDirection);
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({
        status: input.status,
        jobType: input.jobType,
        ids: csv(input.ids),
        includeUnscheduled: input.includeUnscheduled,
        onlyInvoiceable: input.onlyInvoiceable,
        visitsAssignedToUserId: input.visitsAssignedToUserId,
        visitsScheduledBetween: dateRange(
          input.visitsScheduledAfter,
          input.visitsScheduledBefore,
        ),
      }),
      searchTerm: input.searchTerm,
      sort: sort ? [sort] : undefined,
      first: input.first ?? 25,
      after: input.after,
    });
  },
};

export default jobList;
