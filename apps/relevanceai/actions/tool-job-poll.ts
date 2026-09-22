import type { ActionDefinition } from "@w6w/types";
import { encodeId, RelevanceAiClient } from "../lib/client.ts";
import { afterMessageIdParam, jobIdParam, pageSizeParam, toolIdParam } from "../lib/params.ts";

/**
 * `GET /studios/{studio_id}/async_poll/{job_id}` — what an async job has done.
 *
 * Both ids are path segments, and both are needed: this is the one route in the
 * app that takes the tool id *and* the job id, because the vendor scopes a job's
 * update stream to its tool.
 *
 * ## Read `type` as the job's state, and `updates` as what it emitted
 *
 * `StudioAsyncPollOutput` is `{type, updates, last_message_id}`, where `type` is
 * the enum `timeout | inprogress | complete | failed`. `timeout` is not a
 * failure — it means this poll had nothing new to say within the server's own
 * budget, so poll again. `updates` is a list of message-ish objects (the schema
 * gives its items a single property) and `last_message_id` is the cursor: pass
 * it back as `afterMessageId` to fetch only what is new, which is what makes
 * polling a long job cheap instead of re-reading its whole history each time.
 */
interface Input {
  toolId: string;
  jobId: string;
  afterMessageId?: number;
  pageSize?: number;
}

const toolJobPoll: ActionDefinition<Input> = {
  key: "tool-job-poll",
  type: "read",
  resource: "tool",
  title: "Poll Tool Job",
  description:
    "Read a job's updates and state (timeout | inprogress | complete | failed). Poll again on " +
    "`timeout`.",
  params: [toolIdParam, jobIdParam, afterMessageIdParam, pageSizeParam(50)],
  output: [
    { key: "type", type: "string", label: "timeout | inprogress | complete | failed" },
    { key: "updates", type: "array", label: "Updates since the given message id" },
    { key: "last_message_id", type: "number", label: "Cursor to pass back as afterMessageId" },
  ],

  execute(input, ctx) {
    return new RelevanceAiClient(ctx).json(
      `/studios/${encodeId(input.toolId)}/async_poll/${encodeId(input.jobId)}`,
      {
        query: {
          after_message_id: input.afterMessageId,
          page_size: input.pageSize,
        },
      },
    );
  },
};

export default toolJobPoll;
