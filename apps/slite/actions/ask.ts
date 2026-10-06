import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";

/**
 * `GET /v1/ask` (operationId `ask`) — a natural-language question over the key user's notes.
 *
 * Two outcomes, told apart by status:
 *
 *  - `200` — `{answer, sources: [{id, title, url, updatedAt, explanation?}]}`, returned as is
 *    with `status: "completed"` added.
 *  - `202` — the answer needs longer than Slite's ~50 s synchronous deadline and is still being
 *    prepared. The body is `{status: "processing", threadId, retryAfterSeconds, message,
 *    answer, sources: []}`; `answer` is only a pointer sentence for old clients. This action
 *    returns `{status: "processing", threadId, retryAfterSeconds}` WITHOUT `answer`/`sources`,
 *    so a workflow cannot mistake the pointer for an answer, and polls with `thread-get`.
 *    Passing `wait: true` asks Slite to hold the connection for the full answer instead.
 *
 * A separate rate limit (`AskRateLimitedError`) and an "Ask disabled" error are documented;
 * both surface as the vendor's own message in the thrown error.
 */
interface Input {
  question: string;
  parentNoteId?: string;
  assistantId?: string;
  wait?: boolean;
}

const ask: ActionDefinition<Input> = {
  key: "ask",
  type: "read",
  resource: "answer",
  title: "Ask a Question",
  description: "Ask Slite a question in natural language and get an answer with its sources. " +
    "When Slite needs longer it returns a thread id to poll with Get Thread.",
  params: [
    {
      key: "question",
      label: "Question",
      type: "string",
      required: true,
      hint: "Answered from the notes the key's user can see.",
    },
    {
      key: "parentNoteId",
      label: "Parent note ID",
      type: "string",
      hint: "Only use notes under this parent note.",
    },
    {
      key: "assistantId",
      label: "Assistant ID",
      type: "string",
      hint: "Use a specific assistant (Slite documents this for Super only).",
    },
    {
      key: "wait",
      label: "Wait for the full answer",
      type: "boolean",
      hint: "Hold the request until the answer is ready instead of getting a thread to poll. " +
        "Can take several minutes.",
    },
  ],
  output: [
    {
      key: "status",
      type: "string",
      label: "completed, or processing when a thread must be polled",
    },
    { key: "answer", type: "string", label: "The answer (completed only)" },
    { key: "sources", type: "array", label: "Notes the answer drew on (completed only)" },
    { key: "threadId", type: "string", label: "Thread to poll (processing only)" },
    { key: "retryAfterSeconds", type: "number", label: "Suggested wait before polling" },
  ],

  async execute(input, ctx) {
    const question = (input.question ?? "").trim();
    if (!question) throw new Error("question is required");
    const res = await new SliteClient(ctx).requestRaw<Record<string, unknown>>("/ask", {
      query: {
        question,
        parentNoteId: input.parentNoteId,
        assistantId: input.assistantId,
        wait: input.wait,
      },
    });
    const body = res.body ?? {};
    if (res.status === 202 || body.status === "processing") {
      const after = typeof body.retryAfterSeconds === "number"
        ? body.retryAfterSeconds
        : res.retryAfter !== undefined && Number.isFinite(Number(res.retryAfter))
        ? Number(res.retryAfter)
        : undefined;
      return {
        status: "processing",
        threadId: body.threadId,
        retryAfterSeconds: after,
        message: body.message,
      };
    }
    return { status: "completed", answer: body.answer, sources: body.sources ?? [] };
  },
};

export default ask;
