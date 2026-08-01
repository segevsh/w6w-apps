import type { ActionDefinition } from "@w6w/types";
import { JenkinsClient, jobPath } from "../lib/client.ts";

interface Input {
  job: string;
  buildNumber?: string | number;
}

/**
 * `GET /job/<name>/<buildNumber>/api/json` — the same `.../api/json` suffix
 * convention as every other Jenkins REST read. `buildNumber` accepts either a
 * literal build number or one of Jenkins' own permalinks (`lastBuild`,
 * `lastSuccessfulBuild`, `lastFailedBuild`, `lastStableBuild`), which Jenkins
 * resolves server-side to the matching build — so "give me the latest status"
 * needs no separate lookup call.
 */
const getBuildStatus: ActionDefinition<Input> = {
  key: "get-build-status",
  type: "read",
  resource: "build",
  title: "Get Build Status",
  description: "Get the status/result of a specific build, or a permalink such as `lastBuild`.",
  params: [
    {
      key: "job",
      label: "Job",
      type: "string",
      required: true,
      placeholder: "my-job",
      hint: "Job name, or `folder/job` for a job nested in a folder.",
    },
    {
      key: "buildNumber",
      label: "Build Number",
      type: "string",
      default: "lastBuild",
      hint: "A build number, or a Jenkins permalink: `lastBuild`, `lastSuccessfulBuild`, " +
        "`lastFailedBuild`, `lastStableBuild`.",
    },
  ],
  output: [
    { key: "number", type: "number", label: "Build number" },
    {
      key: "result",
      type: "string",
      label: "Result — SUCCESS/FAILURE/ABORTED/…, null while running",
    },
    { key: "building", type: "boolean", label: "Still running" },
    { key: "url", type: "string", label: "Build URL" },
    { key: "duration", type: "number", label: "Duration (ms)" },
  ],

  execute(input, ctx) {
    const client = JenkinsClient.fromConnection(ctx);
    const build = encodeURIComponent(String(input.buildNumber ?? "lastBuild"));
    return client.getJson(`/${jobPath(input.job)}/${build}/api/json`);
  },
};

export default getBuildStatus;
