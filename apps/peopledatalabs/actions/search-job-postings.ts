import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PdlClient } from "../lib/client.ts";
import { sandboxParam } from "../lib/params.ts";
import { queryParam, scrollTokenParam, sizeParam } from "../lib/search.ts";

type Input = Record<string, unknown>;

const searchJobPostings: ActionDefinition<Input> = {
  key: "search-job-postings",
  type: "search",
  resource: "job_posting",
  title: "Search Job Postings",
  description:
    "Search the PDL job posting dataset (Beta) by field filters or an Elasticsearch query — exactly one of the two. Costs one credit per record returned, so set the page size. Page with the scroll_token. An empty result is found: false with no records, not an error.",
  params: [
    {
      key: "filters",
      label: "Field filters",
      type: "json",
      hint:
        'A JSON object of PDL filters, e.g. {"title":"data engineer","company_name":"anthropic","location":"united states","is_active":true,"salary_range_min":100000}. Also: id, first_seen_min/max, deactivated_date_min/max, last_verified_min/max (YYYY-MM-DD), title_class, title_role, title_sub_role, title_levels, company_id, company_website, company_profile, company_industry, company_industry_v2, description, salary_range_max, salary_currency, salary_period, remote_work_policy, inferred_skills.',
    },
    queryParam("job posting"),
    sizeParam,
    scrollTokenParam,
    sandboxParam,
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned records" },
    { key: "status", type: "number", label: "PDL status" },
    { key: "data", type: "array", label: "Job posting records, newest first" },
    { key: "total", type: "number", label: "Total records matching" },
    { key: "scroll_token", type: "string", label: "Pass back to fetch the next page" },
    { key: "dataset_version", type: "string", label: "Dataset release" },
  ],

  async execute(input, ctx) {
    const filters = jsonValue(input.filters, "filters");
    const query = jsonValue(input.query, "query");
    if (
      filters !== undefined &&
      (typeof filters !== "object" || filters === null || Array.isArray(filters))
    ) {
      throw new Error("filters must be a JSON object.");
    }
    if (filters !== undefined && query !== undefined) {
      throw new Error("Give field filters or an Elasticsearch query, not both.");
    }
    if (filters === undefined && query === undefined) {
      throw new Error("Give field filters or an Elasticsearch query.");
    }
    const size = input.size;
    if (size !== undefined && size !== null && size !== "") {
      const n = Number(size);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        throw new Error("size must be a whole number between 1 and 100.");
      }
    }
    const body = compact({
      ...(filters as Record<string, unknown> | undefined),
      query,
      size,
      scroll_token: input.scroll_token,
    });
    return await new PdlClient(ctx).request("POST", "/v5/job_posting/search", {
      body,
      sandbox: input.sandbox === true,
      notFound: { data: [], total: 0, scroll_token: null },
    });
  },
};

export default searchJobPostings;
