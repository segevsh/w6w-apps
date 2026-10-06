import type { ActionDefinition } from "@w6w/types";
import { requireObject, WizaClient } from "../lib/client.ts";

interface Input {
  filters: unknown;
  size?: number;
}

export const PROSPECT_FILTERS_HINT =
  'The API\'s filter object, e.g. {"job_title":[{"v":"cto","s":"i"}],"job_title_level":["CXO"],"location":[{"v":"Toronto, Ontario, Canada","b":"city","s":"i"}],"company_size":["51-200"]}. Filters: first_name, last_name, job_title, job_title_level, job_role, job_sub_role, location, skill, last_role_change, last_company_change, school, major, linkedin_slug, job_company, past_company, company_location, company_industry, company_size, technologies, company_annual_growth, department_size, revenue, funding_date, last_funding_min/max, funding_min/max, funding_stage, funding_type, company_type, company_summary, year_founded_start/end. {v, s} entries use s "i" (include) or "e" (exclude). Resolve locations and technologies with the two search actions.';

const searchProspects: ActionDefinition<Input> = {
  key: "search-prospects",
  type: "search",
  resource: "prospect",
  title: "Search Prospects",
  description:
    "Count the prospects matching a set of filters, and optionally preview up to 30 of them (POST /api/prospects/search). `size` defaults to 0, which returns only the total. Previewed profiles carry no email or phone: create a prospect list to enrich them. Returned profiles are billed in API credits (see `credits`).",
  params: [
    {
      key: "filters",
      label: "Filters",
      type: "json",
      required: true,
      hint: PROSPECT_FILTERS_HINT,
    },
    {
      key: "size",
      label: "Preview size",
      type: "number",
      default: 0,
      hint: "Profiles to return, 0-30. 0 returns the count only.",
      validation: { min: 0, max: 30, integer: true },
    },
  ],
  output: [
    { key: "total", type: "number", label: "Prospects matching the filters" },
    { key: "profiles", type: "array", label: "Preview profiles (name, title, company, location)" },
    { key: "credits", type: "object", label: "API credits charged, when profiles were returned" },
  ],

  async execute(input, ctx) {
    const filters = requireObject(input.filters, "filters");
    const size = input.size ?? 0;
    if (!Number.isInteger(size) || size < 0 || size > 30) {
      throw new Error("size must be an integer from 0 to 30");
    }
    const body = await new WizaClient(ctx).call<
      { data?: { total?: number; profiles?: unknown[]; credits?: unknown } }
    >("/api/prospects/search", { method: "POST", body: { size, filters } });
    const data = body.data ?? {};
    return { total: data.total ?? 0, profiles: data.profiles ?? [], credits: data.credits ?? null };
  },
};

export default searchProspects;
