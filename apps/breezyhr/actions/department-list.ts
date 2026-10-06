import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
}

/** `GET /company/{id}/departments` — a department's `name` is what a position's `department` takes. */
const departmentList: ActionDefinition<Input> = {
  key: "department-list",
  type: "search",
  resource: "company",
  title: "List Departments",
  description:
    "List the company's departments. A department's name is the value Create/Update Position accepts.",
  params: [companyIdParam],
  output: [{ key: "departments", type: "array", label: "Departments (id, name)" }],

  async execute(input, ctx) {
    return {
      departments: await new BreezyClient(ctx).array(`${company(input.companyId)}/departments`),
    };
  },
};

export default departmentList;
