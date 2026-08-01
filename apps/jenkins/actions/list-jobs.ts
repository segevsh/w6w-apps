import type { ActionDefinition } from "@w6w/types";
import { JenkinsClient, jobPath } from "../lib/client.ts";

interface Input {
  folder?: string;
}

interface JobSummary {
  name?: string;
  url?: string;
  color?: string;
  buildable?: boolean;
}

interface Output {
  jobs: JobSummary[];
}

/**
 * `GET /api/json?tree=jobs[name,url,color,buildable]` at the instance root
 * lists top-level jobs; the same call against `/job/<folder>/api/json` lists
 * a folder's immediate children (Folders plugin). The `tree` query narrows
 * the response to just the fields listed, which is the documented way to
 * avoid pulling every job's full model over the wire for what is usually just
 * a picker list.
 */
const listJobs: ActionDefinition<Input, Output> = {
  key: "list-jobs",
  type: "read",
  resource: "job",
  title: "List Jobs",
  description: "List jobs at the instance root, or inside a folder.",
  params: [
    {
      key: "folder",
      label: "Folder",
      type: "string",
      hint:
        "Folder path (`team/project`) to list nested jobs. Leave empty to list root-level jobs.",
    },
  ],
  output: [{ key: "jobs", type: "array", label: "Jobs" }],

  async execute(input, ctx) {
    const client = JenkinsClient.fromConnection(ctx);
    const path = input.folder ? `/${jobPath(input.folder)}/api/json` : "/api/json";
    const data = await client.getJson<{ jobs?: JobSummary[] }>(path, {
      tree: "jobs[name,url,color,buildable]",
    });
    return { jobs: data.jobs ?? [] };
  },
};

export default listJobs;
