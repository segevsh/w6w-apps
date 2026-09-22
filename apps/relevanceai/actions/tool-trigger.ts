import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeId, RelevanceAiClient } from "../lib/client.ts";
import {
  maxJobDurationParam,
  toolIdParam,
  toolParamsParam,
  toolVersionParam,
} from "../lib/params.ts";

/**
 * `POST /studios/{studio_id}/trigger` — run a tool and wait for its output.
 *
 * "Studio" is the API's internal name for what Relevance AI's own product
 * documentation calls a **Tool** (`get-started/core-concepts/tools.mdx`), so
 * every user-facing label here says Tool while the path and body fields keep the
 * API's spelling.
 *
 * `TriggerStudioInput` declares `params`, `version`, `tool_version`,
 * `max_job_duration`, `job_id`, `executor`, `studio_context`, `studio_override`
 * and `orchestrator` — all optional, because the *tool* decides what `params`
 * must contain. Three are exposed: the one the caller must actually fill
 * (`params`), the version selector the vendor documents (`tool_version`), and
 * the job-duration strategy. `executor`/`studio_override`/`orchestrator` reach
 * into the tool's own runtime configuration and are left to the vendor's UI.
 *
 * `version` is deliberately **not** exposed even though the schema accepts it:
 * on the studio endpoints the vendor's own `tool_version` is the documented
 * selector ("can be 'active', 'draft' or a specific version_id") while `version`
 * carries no description at all, and offering two overlapping version knobs is
 * how a caller ends up pinning the wrong one.
 *
 * The answer is `TriggerStudioOutput` — the tool's `output`, a `status`
 * (`complete`, `inprogress`, `failed`, `cancelled`), any `errors`, `cost`,
 * `credits_used` and `executionTime`. Note the `status`: a tool that needs longer
 * than the request's budget returns `inprogress` here with no output, which is
 * the documented reason `tool-trigger-async` + `tool-job-poll` exist.
 */
interface Input {
  toolId: string;
  params?: unknown;
  toolVersion?: string;
  maxJobDuration?: string;
}

const toolTrigger: ActionDefinition<Input> = {
  key: "tool-trigger",
  type: "perform",
  resource: "tool",
  idempotent: false,
  title: "Trigger Tool",
  description: "Run a tool synchronously and return its output, status and cost.",
  params: [toolIdParam, toolParamsParam, toolVersionParam, maxJobDurationParam],
  output: [
    { key: "output", type: "object", label: "The tool's own output" },
    { key: "status", type: "string", label: "complete | inprogress | failed | cancelled" },
    { key: "errors", type: "array", label: "Errors" },
    { key: "cost", type: "number", label: "Cost" },
    { key: "credits_used", type: "array", label: "Credits used" },
    { key: "executionTime", type: "number", label: "Execution time" },
  ],

  execute(input, ctx) {
    ctx.log("info", "triggering tool", { toolId: input.toolId });
    return new RelevanceAiClient(ctx).json(`/studios/${encodeId(input.toolId)}/trigger`, {
      method: "POST",
      body: {
        params: asOptionalJson(input.params, "params"),
        tool_version: input.toolVersion,
        max_job_duration: input.maxJobDuration,
      },
    });
  },
};

export default toolTrigger;
