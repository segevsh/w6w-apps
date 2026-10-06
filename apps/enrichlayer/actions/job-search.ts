import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient, nextCursor } from "../lib/client.ts";

interface Input {
  jobType?: string;
  experienceLevel?: string;
  when?: string;
  flexibility?: string;
  geoId?: string;
  keyword?: string;
  searchId?: string;
  pagination?: string;
}

/** `GET /company/job` */
const jobSearch: ActionDefinition<Input> = {
  key: "job-search",
  type: "search",
  resource: "job",
  title: "Search Company Jobs",
  description:
    "List jobs posted by a company (2 credits). Use the company's `search_id` from its profile.",
  params: [
    {
      key: "jobType",
      label: "Job type",
      type: "select",
      options: [
        { value: "anything", label: "anything" },
        { value: "full-time", label: "full-time" },
        { value: "part-time", label: "part-time" },
        { value: "contract", label: "contract" },
        { value: "internship", label: "internship" },
        { value: "temporary", label: "temporary" },
        { value: "volunteer", label: "volunteer" },
      ],
    },
    {
      key: "experienceLevel",
      label: "Experience level",
      type: "select",
      options: [
        { value: "anything", label: "anything" },
        { value: "internship", label: "internship" },
        { value: "entry_level", label: "entry_level" },
        { value: "associate", label: "associate" },
        { value: "mid_senior_level", label: "mid_senior_level" },
        { value: "director", label: "director" },
      ],
    },
    {
      key: "when",
      label: "Posted",
      type: "select",
      options: [
        { value: "anytime", label: "anytime" },
        { value: "yesterday", label: "yesterday" },
        { value: "past-week", label: "past-week" },
        { value: "past-month", label: "past-month" },
      ],
    },
    {
      key: "flexibility",
      label: "Flexibility",
      type: "select",
      options: [{ value: "anything", label: "anything" }, { value: "remote", label: "remote" }, {
        value: "on-site",
        label: "on-site",
      }, { value: "hybrid", label: "hybrid" }],
    },
    { key: "geoId", label: "Geo ID", type: "string", hint: "For example 92000000 for worldwide." },
    { key: "keyword", label: "Keyword", type: "string" },
    {
      key: "searchId",
      label: "Company search ID",
      type: "string",
      hint: "The company's `search_id` from Get Company Profile.",
    },
    {
      key: "pagination",
      label: "Pagination token",
      type: "string",
      hint: "The `nextPagination` from the previous page.",
    },
  ],
  output: [
    { key: "jobs", type: "array", label: "Jobs (company, title, URL, list date, location)" },
    {
      key: "nextPagination",
      type: "string",
      label: "Token for the next page (null on the last page)",
    },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/job", {
      job_type: input.jobType,
      experience_level: input.experienceLevel,
      when: input.when,
      flexibility: input.flexibility,
      geo_id: input.geoId,
      keyword: input.keyword,
      search_id: input.searchId,
      pagination: input.pagination,
    });
    return {
      jobs: (res as { job?: unknown[] }).job ?? [],
      nextPagination: nextCursor(
        (res as { next_page_api_url?: string | null }).next_page_api_url,
        "pagination",
      ),
    };
  },
};

export default jobSearch;
