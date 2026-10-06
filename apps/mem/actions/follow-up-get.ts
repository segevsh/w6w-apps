import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/** `GET /v2/follow-ups/{follow_up_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const followUpGet: ActionDefinition<Input> = {
  key: "follow-up-get",
  type: "read",
  resource: "follow-up",
  title: "Get Follow-up",
  description:
    "Fetch one follow-up. The vendor wraps it as {follow_up}; this action returns the follow-up itself.",
  params: [
    str("follow_up_id", "Follow-up ID", { required: true }),
  ],
  output: [
    { key: "id", type: "string", label: "Follow-up ID" },
    { key: "content", type: "string", label: "What to follow up on" },
    { key: "status", type: "string", label: "pending, fired, completed or canceled" },
    { key: "scheduled_for", type: "string", label: "When it is scheduled" },
    { key: "task_id", type: "string", label: "Task ID, or null" },
    { key: "project_id", type: "string", label: "Project ID, or null" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", `/v2/follow-ups/${encodeId(input.follow_up_id)}`);
    return (body.follow_up ?? {}) as Record<string, unknown>;
  },
};

export default followUpGet;
