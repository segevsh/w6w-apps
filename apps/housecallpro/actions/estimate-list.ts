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
 * `GET /estimates` — the estimate list.
 *
 * Same filter surface as `GET /jobs` apart from `expand`, which offers only
 * `attachments` here. An estimate carries `options`, each of which has its own
 * line items and its own approval state.
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

const estimateList: ActionDefinition<Input, NormalizedList> = {
  key: "estimate-list",
  type: "search",
  resource: "estimate",
  title: "Find Estimates",
  description: "List estimates, filtered by customer, assigned employee, status or schedule dates.",
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
      hint: "Filter vocabulary; empty returns every status.",
    },
    { key: "scheduledStartMin", label: "Scheduled start from", type: "datetime" },
    { key: "scheduledStartMax", label: "Scheduled start to", type: "datetime" },
    { key: "scheduledEndMin", label: "Scheduled end from", type: "datetime" },
    { key: "scheduledEndMax", label: "Scheduled end to", type: "datetime" },
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [{ value: "attachments", label: "Attachments" }],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created_at",
      options: [
        { value: "created_at", label: "Created at (default)" },
        { value: "updated_at", label: "Updated at" },
        { value: "id", label: "ID" },
      ],
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Estimates"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/estimates", "estimates", {
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

export default estimateList;
