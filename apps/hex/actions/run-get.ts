import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient } from "../lib/client.ts";
import { projectIdParam, runIdParam } from "../lib/params.ts";

/**
 * `GET /v1/projects/{projectId}/runs/{runId}` — the state of one run.
 *
 * Poll until `status` is `COMPLETED`, `ERRORED`, `KILLED` or
 * `UNABLE_TO_ALLOCATE_KERNEL`. `startTime`, `endTime` and `elapsedTime` (ms) are
 * null until the run has started or finished. The default rate limit for this
 * group is 30 requests per minute, so poll no faster than every few seconds.
 */
interface Input {
  projectId: string;
  runId: string;
}

const runGet: ActionDefinition<Input> = {
  key: "run-get",
  type: "read",
  resource: "run",
  title: "Get Run Status",
  description: "Fetch the status of one project run: state, trigger, timings and run URL.",
  params: [projectIdParam, runIdParam],
  output: [
    { key: "runId", type: "string", label: "Run ID" },
    {
      key: "status",
      type: "string",
      label: "PENDING, RUNNING, COMPLETED, ERRORED, KILLED or UNABLE_TO_ALLOCATE_KERNEL",
    },
    { key: "runTrigger", type: "string", label: "API, SCHEDULED or APP_REFRESH" },
    { key: "startTime", type: "string", label: "Start time (null until started)" },
    { key: "endTime", type: "string", label: "End time (null until finished)" },
    { key: "elapsedTime", type: "number", label: "Elapsed milliseconds" },
    { key: "runUrl", type: "string", label: "Run URL" },
  ],

  execute(input, ctx) {
    return new HexClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/runs/${encodeId(input.runId)}`,
    );
  },
};

export default runGet;
