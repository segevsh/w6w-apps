import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput, paginationParams, sortDirectionParam } from "../lib/params.ts";

/**
 * `GET /employees` — the **active** employees, which is what the reference says
 * and is narrower than it looks: "Get all of the active employees in an
 * organiztion." There is no documented parameter to include deactivated ones, so
 * an id that no longer appears here may still be attached to historical jobs.
 */
interface Input {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: string;
}

const employeeList: ActionDefinition<Input, NormalizedList> = {
  key: "employee-list",
  type: "read",
  resource: "employee",
  title: "Find Employees",
  description:
    "List the active employees, with their roles and permissions. Deactivated employees are not " +
    "returned and there is no documented way to include them.",
  params: [
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      default: "created_at",
      hint: "An employee attribute. The reference documents the default but no list of values.",
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Employees"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/employees", "employees", {
      companyId: input.companyId,
      query: {
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default employeeList;
