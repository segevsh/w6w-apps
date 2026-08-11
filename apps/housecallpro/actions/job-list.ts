import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList, toList } from "../lib/client.ts";
import {
  companyIdParam,
  listOutput,
  paginationParams,
  sortDirectionParam,
  workStatusFilterOptions,
} from "../lib/params.ts";

/**
 * `GET /jobs` — the job list, with the date, employee, customer and status
 * filters the reference documents.
 *
 * The `workStatus` values here are the **filter** vocabulary
 * (`unscheduled` / `scheduled` / `in_progress` / `completed` / `canceled`), not
 * the seven space-separated values a job's own `work_status` field reports.
 * Feeding a response value back in returns nothing. See `lib/params.ts`.
 */
interface Input {
  customerId?: string;
  employeeIds?: string[] | string;
  workStatus?: string[] | string;
  scheduledStartMin?: string;
  scheduledStartMax?: string;
  scheduledEndMin?: string;
  scheduledEndMax?: string;
  expand?: string[] | string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: string;
}

const jobList: ActionDefinition<Input, NormalizedList> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "Find Jobs",
  description: "List jobs, filtered by customer, assigned employee, work status or schedule dates.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "employeeIds",
      label: "Employee IDs",
      type: "string",
      hint: "Comma-separated employee ids.",
    },
    {
      key: "workStatus",
      label: "Work status",
      type: "multiselect",
      options: workStatusFilterOptions,
      hint: "Filter vocabulary, which differs from the values a job reports: `in_progress` here, " +
        "`in progress` in the response. Empty returns every status.",
    },
    {
      key: "scheduledStartMin",
      label: "Scheduled start from",
      type: "datetime",
      hint: "ISO-8601, e.g. 2026-03-23T15:30:00.",
    },
    { key: "scheduledStartMax", label: "Scheduled start to", type: "datetime" },
    { key: "scheduledEndMin", label: "Scheduled end from", type: "datetime" },
    { key: "scheduledEndMax", label: "Scheduled end to", type: "datetime" },
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [
        { value: "attachments", label: "Attachments" },
        { value: "appointments", label: "Appointments" },
      ],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created_at",
      options: [
        { value: "created_at", label: "Created at (default)" },
        { value: "updated_at", label: "Updated at" },
        { value: "invoice_number", label: "Invoice number" },
        { value: "id", label: "ID" },
        { value: "description", label: "Description" },
        { value: "work_status", label: "Work status" },
      ],
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Jobs"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/jobs", "jobs", {
      companyId: input.companyId,
      query: {
        customer_id: input.customerId,
        employee_ids: toList(input.employeeIds),
        work_status: toList(input.workStatus),
        scheduled_start_min: input.scheduledStartMin,
        scheduled_start_max: input.scheduledStartMax,
        scheduled_end_min: input.scheduledEndMin,
        scheduled_end_max: input.scheduledEndMax,
        expand: toList(input.expand),
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default jobList;
