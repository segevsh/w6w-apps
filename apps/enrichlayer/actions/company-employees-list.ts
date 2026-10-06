import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient, nextCursor } from "../lib/client.ts";

interface Input {
  url: string;
  coyNameMatch?: string;
  useCache?: string;
  country?: string;
  enrichProfiles?: string;
  booleanRoleSearch?: string;
  pageSize?: number;
  employmentStatus?: string;
  sortBy?: string;
  resolveNumericId?: string;
  after?: string;
}

/** `GET /company/employees/` */
const companyEmployeesList: ActionDefinition<Input> = {
  key: "company-employees-list",
  type: "search",
  resource: "company",
  title: "List Company Employees",
  description:
    "List a company's employees (3 credits per employee returned). Filters, sorting, enrichment and freshness add credits; see each field.",
  params: [
    { key: "url", label: "Company profile URL", type: "string", required: true },
    {
      key: "coyNameMatch",
      label: "Match by company name",
      type: "select",
      hint:
        "include (default) also matches profiles whose work experience names the company exactly.",
      options: [{ value: "include", label: "include" }, { value: "exclude", label: "exclude" }],
    },
    {
      key: "useCache",
      label: "Cache freshness",
      type: "select",
      hint: "if-recent costs 1 to 2 extra credits per result and limits the page size to 10.",
      options: [{ value: "if-present", label: "if-present" }, {
        value: "if-recent",
        label: "if-recent",
      }],
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "Comma-separated alpha-2 codes. Costs 3 extra credits per result.",
    },
    {
      key: "enrichProfiles",
      label: "Enrich profiles",
      type: "select",
      hint:
        "enrich returns full profiles instead of profile URLs, 1 extra credit per result, and caps the page size at 10.",
      options: [{ value: "skip", label: "skip" }, { value: "enrich", label: "enrich" }],
    },
    {
      key: "booleanRoleSearch",
      label: "Job title (boolean search)",
      type: "string",
      hint: "Max 255 characters. Base cost becomes 10 credits plus 3 per employee matched.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "1 to 9999 (default 10); 1 to 10 when enriching.",
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
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      hint: "Anything but none adds 50 credits plus 10 per employee.",
      options: [
        { value: "none", label: "none" },
        { value: "recently-joined", label: "recently-joined" },
        { value: "recently-left", label: "recently-left" },
        { value: "oldest", label: "oldest" },
      ],
    },
    {
      key: "resolveNumericId",
      label: "Resolve numeric company IDs",
      type: "select",
      hint: "true costs 2 extra credits.",
      options: [{ value: "false", label: "false" }, { value: "true", label: "true" }],
    },
    {
      key: "after",
      label: "Next-page cursor",
      type: "string",
      hint: "The `nextCursor` from the previous page.",
    },
  ],
  output: [
    {
      key: "employees",
      type: "array",
      label: "Employees (profile URL, plus profile when enriched)",
    },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/employees/", {
      url: input.url,
      coy_name_match: input.coyNameMatch,
      use_cache: input.useCache,
      country: input.country,
      enrich_profiles: input.enrichProfiles,
      boolean_role_search: input.booleanRoleSearch,
      page_size: input.pageSize,
      employment_status: input.employmentStatus,
      sort_by: input.sortBy,
      resolve_numeric_id: input.resolveNumericId,
      after: input.after,
    });
    return {
      employees: (res as { employees?: unknown[] }).employees ?? [],
      nextCursor: nextCursor((res as { next_page?: string | null }).next_page, "after"),
    };
  },
};

export default companyEmployeesList;
