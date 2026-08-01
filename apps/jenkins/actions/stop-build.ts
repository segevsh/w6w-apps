import type { ActionDefinition } from "@w6w/types";
import { JenkinsClient, jobPath } from "../lib/client.ts";

interface Input {
  job: string;
  buildNumber?: string | number;
}

interface Output {
  stopped: boolean;
}

/**
 * `POST /job/<name>/<buildNumber>/stop` aborts a running build. Same
 * permalink acceptance as `get-build-status` (`lastBuild` and friends resolve
 * server-side), so stopping "whatever is running right now" needs no prior
 * lookup call.
 *
 * Marked `idempotent: true`: stopping a build that has already finished (or
 * was already stopped) has no further effect beyond the first call — there is
 * no new resource created and no additional state change to duplicate.
 */
const stopBuild: ActionDefinition<Input, Output> = {
  key: "stop-build",
  type: "perform",
  resource: "build",
  title: "Stop Build",
  description: "Abort a running build.",
  idempotent: true,
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
      hint: "A build number, or a Jenkins permalink such as `lastBuild`.",
    },
  ],
  output: [{ key: "stopped", type: "boolean", label: "Stop request accepted" }],

  async execute(input, ctx) {
    const client = JenkinsClient.fromConnection(ctx);
    const build = encodeURIComponent(String(input.buildNumber ?? "lastBuild"));
    await client.post(`/${jobPath(input.job)}/${build}/stop`);
    return { stopped: true };
  },
};

export default stopBuild;
