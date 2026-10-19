import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  sessionId: string;
  eventId?: string;
}

/** POST /v1/sessions/{session_id}/cancel — cancel-session. */
const action: ActionDefinition<Input> = {
  key: "cancel-session",
  type: "perform",
  resource: "session",
  title: "Cancel Session",
  description: "Cancel a session.",
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
  ],
  idempotent: false,
  params: [{
    "key": "sessionId",
    "label": "Session ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the session to cancel.",
  }, {
    "key": "eventId",
    "label": "Event ID",
    "type": "string",
    "hint":
      "A session event identifying the turn to cancel. If omitted, cancels the current nonterminal turn.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/sessions/${pathId(input.sessionId)}/cancel`, {
      method: "POST",
      body: {
        "event_id": input.eventId,
      },
    });
  },
};

export default action;
