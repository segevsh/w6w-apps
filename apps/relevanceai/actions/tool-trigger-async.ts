import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeId, RelevanceAiClient } from "../lib/client.ts";
import {
  maxJobDurationParam,
  toolIdParam,
  toolParamsParam,
  toolVersionParam,
} from "../lib/params.ts";

/**
 * `POST /studios/{studio_id}/trigger_async` — start a tool and return at once.
 *
 * The async sibling of `tool-trigger`, with its own input schema
 * (`TriggerStudioAsyncInput`, the same nine optional members) and a much smaller
 * answer: `TriggerStudioAsyncOutput` is `{job_id, project, studio_id}` — a job
 * receipt, not a result. The tool's output arrives through
 * `tool-job-poll` (`GET /studios/{studio_id}/async_poll/{job_id}`), which is why
 * the `studio_id` is echoed back here: the poll path needs both ids.
 *
 * It is a separate action rather than a flag on `tool-trigger` because the two
 * have different return shapes and different failure modes — a synchronous
 * trigger can report the tool's own `errors` inline, while an asynchronous one
 * cannot report anything at all beyond "the job was accepted".
 *
 * Not idempotent: the input's `job_id` is settable, but it is a *requested*
 * identifier the vendor's queue owns, not a dedupe key this app can invent
 * safely. A retry starts a second job.
 */
interface Input {
  toolId: string;
  params?: unknown;
  toolVersion?: string;
  maxJobDuration?: string;
}

const toolTriggerAsync: ActionDefinition<Input> = {
  key: "tool-trigger-async",
  type: "perform",
  resource: "tool",
  idempotent: false,
  title: "Trigger Tool (Async)",
  description: "Start a tool asynchronously and return the job id to poll with.",
  params: [toolIdParam, toolParamsParam, toolVersionParam, maxJobDurationParam],
  output: [
    { key: "job_id", type: "string", label: "Job ID" },
    { key: "studio_id", type: "string", label: "Tool ID" },
    { key: "project", type: "string", label: "Project" },
  ],

  execute(input, ctx) {
    ctx.log("info", "triggering tool asynchronously", { toolId: input.toolId });
    return new RelevanceAiClient(ctx).json(`/studios/${encodeId(input.toolId)}/trigger_async`, {
      method: "POST",
      body: {
        params: asOptionalJson(input.params, "params"),
        tool_version: input.toolVersion,
        max_job_duration: input.maxJobDuration,
      },
    });
  },
};

export default toolTriggerAsync;
