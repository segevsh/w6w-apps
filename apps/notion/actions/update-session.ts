import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  message?: string;
  agentId?: string;
  sessionId?: string;
  attachments?: unknown[];
  metadata?: Record<string, unknown>;
  promptContext?: string;
  actions?: unknown[];
  continueFrom?: string;
  responseFormat?: "json" | "event_stream";
}

/** POST /v1/sessions — update-session. */
const action: ActionDefinition<Input> = {
  key: "update-session",
  type: "perform",
  resource: "session",
  title: "Update Session",
  description:
    "Update a session. Starts or continues a session; event streams are returned after completion.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "agent_id", "type": "string", "label": "Agent id" },
    { "key": "title", "type": "string", "label": "Title" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "created_at", "type": "string", "label": "Created at" },
    { "key": "updated_at", "type": "string", "label": "Updated at" },
    { "key": "required_actions", "type": "array", "label": "Required actions" },
    { "key": "error", "type": "object", "label": "Error" },
    { "key": "eventStream", "type": "string", "label": "Buffered server-sent events" },
  ],
  idempotent: false,
  params: [
    { "key": "message", "label": "Message", "type": "string" },
    { "key": "agentId", "label": "Agent ID", "type": "string" },
    { "key": "sessionId", "label": "Session ID", "type": "string" },
    { "key": "attachments", "label": "Attachments", "type": "json" },
    { "key": "metadata", "label": "Metadata", "type": "json" },
    { "key": "promptContext", "label": "Prompt Context", "type": "string" },
    { "key": "actions", "label": "Actions", "type": "json" },
    { "key": "continueFrom", "label": "Continue From", "type": "string" },
    {
      "key": "responseFormat",
      "label": "Response Format",
      "type": "select",
      "options": [{ "value": "json", "label": "json" }, {
        "value": "event_stream",
        "label": "event_stream",
      }],
      "hint":
        "JSON session response, or buffered server-sent events. continueFrom requires event_stream.",
    },
  ],

  execute(input, ctx) {
    if (input.continueFrom && input.responseFormat !== "event_stream") {
      throw new Error("Continue From requires Event Stream response format.");
    }
    const client = new NotionClient(ctx);
    return client.request(`/sessions`, {
      method: "POST",
      accept: input.responseFormat === "event_stream" ? "text/event-stream" : "application/json",
      body: {
        "message": input.message,
        "agent_id": input.agentId,
        "session_id": input.sessionId,
        "attachments": input.attachments,
        "metadata": input.metadata,
        "prompt_context": input.promptContext,
        "actions": input.actions,
        "continue_from": input.continueFrom,
      },
    });
  },
};

export default action;
