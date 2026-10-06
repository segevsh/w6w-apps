import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  url: string;
  coyNameMatch?: string;
  atDate?: string;
  useCache?: string;
  estimatedEmployeeCount?: string;
  employmentStatus?: string;
}

/** `GET /company/employees/count` */
const companyEmployeeCount: ActionDefinition<Input> = {
  key: "company-employee-count",
  type: "read",
  resource: "company",
  title: "Get Company Employee Count",
  description:
    "Return employee counts for a company from several sources (1 credit; historical dates and fresh counts cost extra).",
  params: [
    { key: "url", label: "Company profile URL", type: "string", required: true },
    {
      key: "coyNameMatch",
      label: "Match by company name",
      type: "select",
      options: [{ value: "include", label: "include" }, { value: "exclude", label: "exclude" }],
    },
    {
      key: "atDate",
      label: "As-of date",
      type: "string",
      hint: "YYYY-MM-DD. Costs 1 extra credit on Growth or larger plans, otherwise 5.",
    },
    {
      key: "useCache",
      label: "Cache freshness",
      type: "select",
      hint: "if-recent requires the estimated count to be included and costs 1 extra credit.",
      options: [{ value: "if-present", label: "if-present" }, {
        value: "if-recent",
        label: "if-recent",
      }],
    },
    {
      key: "estimatedEmployeeCount",
      label: "Include estimated count",
      type: "select",
      hint: "include costs 1 extra credit.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "employmentStatus",
      label: "Employment status",
      type: "select",
      hint: "Vendor default is current.",
      options: [{ value: "current", label: "current" }, { value: "past", label: "past" }, {
        value: "all",
        label: "all",
      }],
    },
  ],
  output: [
    {
      key: "verifiedEmployeeCount",
      type: "number",
      label: "Count of profiles verified at the company",
    },
    {
      key: "estimatedEmployeeCount",
      type: "number",
      label: "Estimated count from the company profile (when included)",
    },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/employees/count", {
      url: input.url,
      coy_name_match: input.coyNameMatch,
      at_date: input.atDate,
      use_cache: input.useCache,
      estimated_employee_count: input.estimatedEmployeeCount,
      employment_status: input.employmentStatus,
    });
    return {
      verifiedEmployeeCount:
        (res as { verified_employee_count?: number }).verified_employee_count ?? null,
      estimatedEmployeeCount:
        (res as { estimated_employee_count?: number }).estimated_employee_count ?? null,
    };
  },
};

export default companyEmployeeCount;
