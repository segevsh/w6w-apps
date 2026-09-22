import type { ActionDefinition } from "@w6w/types";
import { RelevanceAiClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `POST /agents/trigger` — send a message to an agent and start (or continue) a
 * conversation.
 *
 * The body is the vendor's own documented, stable public shape (their
 * `api-trigger.mdx` cURL example, cross-checked against the live schema's
 * `TriggerAgentInput.oneOf`, whose first branch declares `message` with
 * `role`+`content` required):
 *
 *     { "agent_id": "…", "message": { "role": "user", "content": "…" },
 *       "conversation_id": "…" }
 *
 * `role` is fixed to `"user"` — the schema accepts other roles only on the
 * branches that require an `action`/`action_request_id` pair, which is the
 * internal resume-a-tool-call protocol, not a trigger.
 *
 * ## What comes back is not the agent's answer
 *
 * `TriggerAgentOutput` is `{job_info, conversation_id, agent_id, state,
 * queued_mid_run?}` — a *job* receipt. The agent's reply is produced
 * asynchronously and read back from the conversation (see `conversation-list`);
 * this action is fire-and-return by design, which is why it is a `perform` and
 * not a `read`.
 *
 * ## Why it is not marked idempotent
 *
 * Every call starts a real agent run, and Relevance AI's trigger input exposes no
 * idempotency key — `external_id` names a conversation in the caller's own
 * system, and reusing it *extends* that conversation rather than deduplicating
 * the request. The runtime may retry an action marked idempotent; marking this
 * one `true` would turn one dropped connection into two billed agent runs.
 */
interface Input {
  agentId: string;
  message: string;
  conversationId?: string;
}

const agentTrigger: ActionDefinition<Input> = {
  key: "agent-trigger",
  type: "perform",
  resource: "agent",
  idempotent: false,
  title: "Trigger Agent",
  description: "Send a message to an agent, starting a new conversation or continuing one.",
  params: [
    agentIdParam,
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      hint: "Sent as the `content` of a `user` message. This is the agent's input for the run.",
    },
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      hint: "Leave empty to start a new conversation; pass a `conversation_id` from a previous " +
        "trigger to continue that one.",
    },
  ],
  output: [
    { key: "agent_id", type: "string", label: "Agent ID" },
    { key: "conversation_id", type: "string", label: "Conversation ID" },
    { key: "state", type: "string", label: "Run state" },
    { key: "queued_mid_run", type: "boolean", label: "Queued into an in-flight run" },
    { key: "job_info", type: "object", label: "Job info" },
  ],

  execute(input, ctx) {
    ctx.log("info", "triggering agent", {
      agentId: input.agentId,
      conversationId: input.conversationId,
    });
    return new RelevanceAiClient(ctx).json("/agents/trigger", {
      method: "POST",
      body: {
        agent_id: input.agentId,
        message: { role: "user", content: input.message },
        conversation_id: input.conversationId,
      },
    });
  },
};

export default agentTrigger;
