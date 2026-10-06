import type { ActionDefinition } from "@w6w/types";
import { PdlClient } from "../lib/client.ts";
import { titlecaseParam } from "../lib/params.ts";

interface Input {
  job_title: string;
  titlecase?: boolean;
}

const enrichJobTitle: ActionDefinition<Input> = {
  key: "enrich-job-title",
  type: "read",
  resource: "job_title",
  title: "Enrich Job Title",
  description:
    "Normalise a job title and get up to five similar titles and five relevant skills for it. The title must exist in PDL's job title dataset or there is no match (found: false, not an error). Costs one credit per match.",
  params: [
    {
      key: "job_title",
      label: "Job title",
      type: "string",
      required: true,
      placeholder: "pastry chef",
    },
    titlecaseParam,
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL knew the title" },
    { key: "cleaned_job_title", type: "string", label: "Normalised title" },
    { key: "similar_job_titles", type: "array", label: "Up to five similar titles" },
    { key: "relevant_skills", type: "array", label: "Up to five relevant skills" },
  ],

  async execute(input, ctx) {
    if (typeof input.job_title !== "string" || input.job_title.trim() === "") {
      throw new Error("job_title is required.");
    }
    return await new PdlClient(ctx).request("GET", "/v5/job_title/enrich", {
      query: { job_title: input.job_title, titlecase: input.titlecase },
      notFound: {},
    });
  },
};

export default enrichJobTitle;
