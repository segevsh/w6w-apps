import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  url: string;
}

/** `GET /job` */
const jobProfileGet: ActionDefinition<Input> = {
  key: "job-profile-get",
  type: "read",
  resource: "job",
  title: "Get Job Profile",
  description:
    "Return the structured data of a job posting from its URL (2 credits). Job Search returns job URLs.",
  params: [
    { key: "url", label: "Job posting URL", type: "string", required: true },
  ],
  output: [
    { key: "job", type: "object", label: "Job profile (the full response body)" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/job", {
      url: input.url,
    });
    return {
      job: res,
    };
  },
};

export default jobProfileGet;
