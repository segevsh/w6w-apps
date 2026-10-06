import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";
import { activeParam, idsParam, listOutput, pagingParams, pagingQuery } from "../lib/params.ts";

/** `GET /settings/v2/tenant/{tenant}/employees`. */
interface Input {
  ids?: string;
  name?: string;
  email?: string;
  active?: string;
  page?: number;
  pageSize?: number;
  includeTotal?: boolean;
}

const employeeList: ActionDefinition<Input> = {
  key: "employee-list",
  type: "search",
  resource: "employee",
  title: "List Employees",
  description: "List the tenant's employees, by name or exact email.",
  params: [
    idsParam,
    { key: "name", label: "Name", type: "string", hint: 'Case-insensitive "contains" match.' },
    { key: "email", label: "Email", type: "string", hint: "Exact match." },
    activeParam,
    ...pagingParams,
  ],
  output: listOutput,

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("settings", "/employees", {
      query: compact({
        ids: idList(input.ids),
        name: input.name,
        email: input.email,
        active: input.active,
        ...pagingQuery(input),
      }),
    });
  },
};

export default employeeList;
