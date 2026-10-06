import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";
import { includesParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  startIndex?: number;
  includes?: string;
  startDate?: string;
  endDate?: string;
  dateFilterType?: string;
  milestones?: string;
  sortBy?: string;
  sortOrder?: string;
  assignment?: string;
}

const action: ActionDefinition<Input> = {
  key: "job-list",
  type: "read",
  resource: "job",
  title: "List Jobs",
  description:
    "List jobs, optionally filtered by milestone and a created/milestone/modified date range. Unassigned leads are excluded unless assignment=unassigned.",
  params: [
    ...pagingParams(25),
    includesParam("contact, initialAppointment"),
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      hint: "YYYY-MM-DD, inclusive. Filters on the field chosen in Date filter type.",
    },
    { key: "endDate", label: "End date", type: "string", hint: "YYYY-MM-DD, inclusive." },
    {
      key: "dateFilterType",
      label: "Date filter type",
      type: "select",
      advanced: true,
      options: [{ value: "CreatedDate", label: "CreatedDate" }, {
        value: "MilestoneDate",
        label: "MilestoneDate",
      }, { value: "ModifiedDate", label: "ModifiedDate" }],
    },
    {
      key: "milestones",
      label: "Milestones",
      type: "string",
      advanced: true,
      hint: "Comma-separated: lead, prospect, approved, completed, invoiced, closed, cancelled.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [{ value: "CreatedDate", label: "CreatedDate" }, {
        value: "MilestoneDate",
        label: "MilestoneDate",
      }, { value: "ModifiedDate", label: "ModifiedDate" }],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      advanced: true,
      options: [{ value: "Ascending", label: "Ascending" }, {
        value: "Descending",
        label: "Descending",
      }],
    },
    {
      key: "assignment",
      label: "Assignment",
      type: "select",
      advanced: true,
      hint: "Cancelled/dead jobs only appear with unassigned.",
      options: [{ value: "assigned", label: "assigned" }, {
        value: "unassigned",
        label: "unassigned",
      }],
    },
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get("/jobs", {
      ...pageQuery(input, "recordStartIndex"),
      includes: input.includes,
      startDate: input.startDate,
      endDate: input.endDate,
      dateFilterType: input.dateFilterType,
      milestones: input.milestones,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      assignment: input.assignment,
    });
  },
};

export default action;
