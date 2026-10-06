import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/**
 * `GET /v1/threads/{threadId}` (operationId `get-thread`) — read an ask/agent thread back as
 * question/answer rounds. It is the poll endpoint for an `ask` that answered `processing`.
 *
 * `status` is one of `processing`, `completed`, `failed`, `needs-approval`. While `processing`
 * Slite answers HTTP 202 and the body carries `retryAfterSeconds`; otherwise 200. Both are
 * returned as is, so the workflow branches on `status`, not on the HTTP code. An unknown thread
 * is a documented 404.
 */
interface Input {
  threadId: string;
}

const threadGet: ActionDefinition<Input> = {
  key: "thread-get",
  type: "read",
  resource: "answer",
  title: "Get Thread",
  description: "Read an ask thread: its status and every question and answer round. Use it to " +
    "poll an answer that Ask returned as processing.",
  params: [
    {
      key: "threadId",
      label: "Thread ID",
      type: "string",
      required: true,
      hint: "The `threadId` from an Ask result that was still processing.",
    },
  ],
  output: [
    { key: "threadId", type: "string", label: "Thread id" },
    { key: "status", type: "string", label: "processing, completed, failed or needs-approval" },
    { key: "title", type: "string", label: "Thread title" },
    { key: "rounds", type: "array", label: "Question / answer rounds, oldest first" },
    { key: "retryAfterSeconds", type: "number", label: "Wait before polling again (processing)" },
    { key: "message", type: "string", label: "Human-readable hint about the state" },
    {
      key: "triageUrl",
      type: "string",
      label: "needs-approval: where drafted changes are reviewed",
    },
    { key: "pendingApprovalCount", type: "number", label: "Drafted changes awaiting approval" },
  ],

  execute(input, ctx) {
    return new SliteClient(ctx).get(`/threads/${seg(input.threadId, "threadId")}`);
  },
};

export default threadGet;
