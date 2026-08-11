import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList, toList } from "../lib/client.ts";
import {
  companyIdParam,
  leadStatusOptions,
  listOutput,
  paginationParams,
  sortDirectionParam,
} from "../lib/params.ts";

/**
 * `GET /leads` — prospective work with no schedule, dispatch or invoice.
 *
 * `status` is a single value here (`open` / `won` / `lost`), unlike the job and
 * estimate `work_status` filters which are arrays. `lead_source` and `tag_ids`
 * are arrays despite `lead_source` being described in the singular.
 */
interface Input {
  customerId?: string;
  status?: string;
  employeeIds?: string[] | string;
  tagIds?: string[] | string;
  leadSource?: string[] | string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: string;
}

const leadList: ActionDefinition<Input, NormalizedList> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "Find Leads",
  description: "List leads, filtered by customer, status, assigned employee, tag or lead source.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "status", label: "Status", type: "select", options: leadStatusOptions },
    {
      key: "employeeIds",
      label: "Employee IDs",
      type: "string",
      hint: "Comma-separated employee ids.",
    },
    { key: "tagIds", label: "Tag IDs", type: "string", hint: "Comma-separated tag ids." },
    {
      key: "leadSource",
      label: "Lead sources",
      type: "string",
      hint: "Comma-separated lead source names, from Get Lead Sources.",
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
        { value: "status", label: "Status" },
      ],
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Leads"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/leads", "leads", {
      companyId: input.companyId,
      query: {
        customer_id: input.customerId,
        status: input.status,
        employee_ids: toList(input.employeeIds),
        tag_ids: toList(input.tagIds),
        lead_source: toList(input.leadSource),
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default leadList;
