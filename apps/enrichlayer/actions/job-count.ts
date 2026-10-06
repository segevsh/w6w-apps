import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  jobType?: string;
  experienceLevel?: string;
  when?: string;
  flexibility?: string;
  geoId?: string;
  keyword?: string;
  searchId?: string;
}

/** `GET /company/job/count` */
const jobCount: ActionDefinition<Input> = {
  key: "job-count",
  type: "read",
  resource: "job",
  title: "Count Company Jobs",
  description: "Count the jobs posted by a company (2 credits).",
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
  ],
  output: [
    { key: "count", type: "number", label: "Number of jobs" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/job/count", {
      job_type: input.jobType,
      experience_level: input.experienceLevel,
      when: input.when,
      flexibility: input.flexibility,
      geo_id: input.geoId,
      keyword: input.keyword,
      search_id: input.searchId,
    });
    return {
      count: (res as { count?: number }).count ?? null,
    };
  },
};

export default jobCount;
