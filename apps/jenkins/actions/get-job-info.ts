import type { ActionDefinition } from "@w6w/types";
import { JenkinsClient, jobPath } from "../lib/client.ts";

interface Input {
  job: string;
}

/**
 * `GET /job/<name>/api/json` — the job's own model: buildability, `color`
 * (Jenkins' ball-color health/status encoding, e.g. `blue`, `red`,
 * `yellow_anime` while a build is running), the next build number to be
 * assigned, and (for a folder) its nested jobs.
 */
const getJobInfo: ActionDefinition<Input> = {
  key: "get-job-info",
  type: "read",
  resource: "job",
  title: "Get Job Info",
  description: "Get a job's configuration model — buildability, status color, next build number.",
  params: [
    {
      key: "job",
      label: "Job",
      type: "string",
      required: true,
      placeholder: "my-job",
      hint: "Job name, or `folder/job` for a job nested in a folder.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Job name" },
    { key: "url", type: "string", label: "Job URL" },
    { key: "buildable", type: "boolean", label: "Buildable" },
    { key: "color", type: "string", label: "Status ball color" },
    { key: "nextBuildNumber", type: "number", label: "Next build number" },
  ],

  execute(input, ctx) {
    const client = JenkinsClient.fromConnection(ctx);
    return client.getJson(`/${jobPath(input.job)}/api/json`);
  },
};

export default getJobInfo;
