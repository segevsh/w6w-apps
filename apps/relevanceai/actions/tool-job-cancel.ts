import type { ActionDefinition } from "@w6w/types";
import { encodeId, RelevanceAiClient } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

/**
 * `POST /studios/{job_id}/cancel` — stop an asynchronous tool job.
 *
 * **Read the path twice.** This route takes the **job** id where
 * `tool-job-poll` and `tool-get` take the **studio** id: the vendor's path is
 * `/studios/{job_id}/cancel`, and the parameter's own name in the schema is
 * `job_id`, not `studio_id`. Sending a tool id here cancels nothing and the
 * vendor's `^[a-zd._-]+$` pattern will not catch the mistake, which is why the
 * param is labelled Job ID and says where to get one.
 *
 * `CancelStudioInput`/`CancelStudioOutput` are both empty objects, so there is no
 * body to send and nothing to unwrap: a 2xx is the whole answer. Verified live
 * that the route exists — unauthenticated it answers the JSON envelope
 * `401 authorization_header_missing` rather than Express's HTML
 * `Cannot POST …`.
 *
 * Idempotent, like `agent-run-cancel`: cancelling a finished job is not a second
 * side effect, and the endpoint accepts no idempotency key.
 */
interface Input {
  jobId: string;
}

const toolJobCancel: ActionDefinition<Input> = {
  key: "tool-job-cancel",
  type: "perform",
  resource: "tool",
  idempotent: true,
  title: "Cancel Tool Job",
  description: "Cancel a tool job started with Trigger Tool (Async).",
  params: [jobIdParam],
  output: [{ key: "cancelled", type: "boolean", label: "Request accepted" }],

  async execute(input, ctx) {
    ctx.log("info", "cancelling tool job", { jobId: input.jobId });
    // The path segment is the JOB id — the vendor's spelling, not a typo here.
    await new RelevanceAiClient(ctx).json(`/studios/${encodeId(input.jobId)}/cancel`, {
      method: "POST",
      body: {},
    });
    return { cancelled: true };
  },
};

export default toolJobCancel;
