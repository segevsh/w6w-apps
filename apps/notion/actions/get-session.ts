import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  sessionId: string;
}

/** GET /v1/sessions/{session_id} — retrieve-session. */
const action: ActionDefinition<Input> = {
  key: "get-session",
  type: "read",
  resource: "session",
  title: "Get Session",
  description: "Retrieve a session.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "agent_id", "type": "string", "label": "Agent id" },
    { "key": "title", "type": "string", "label": "Title" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "created_at", "type": "string", "label": "Created at" },
    { "key": "updated_at", "type": "string", "label": "Updated at" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "agent_version", "type": "object", "label": "Agent version" },
    { "key": "models", "type": "object", "label": "Models" },
    { "key": "required_actions", "type": "array", "label": "Required actions" },
    { "key": "error", "type": "object", "label": "Error" },
    { "key": "trigger_type", "type": "string", "label": "Trigger type" },
    { "key": "type_labels", "type": "object", "label": "Type labels" },
    { "key": "chat_user_emails", "type": "object", "label": "Chat user emails" },
    { "key": "tool_types", "type": "object", "label": "Tool types" },
    { "key": "tool_call_count", "type": "object", "label": "Tool call count" },
    { "key": "credits_used", "type": "object", "label": "Credits used" },
    { "key": "runs_completed", "type": "object", "label": "Runs completed" },
    { "key": "message_count", "type": "object", "label": "Message count" },
  ],
  params: [{
    "key": "sessionId",
    "label": "Session ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the session to retrieve.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/sessions/${pathId(input.sessionId)}`, {
      method: "GET",
    });
  },
};

export default action;
