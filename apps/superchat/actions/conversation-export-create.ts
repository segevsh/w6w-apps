import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  start: string;
  end: string;
}

/** Start an export of a conversation over a time range. Poll Get Conversation Export for the download link. */
const conversationExportCreate: ActionDefinition<Input> = {
  key: "conversation-export-create",
  type: "perform",
  resource: "conversation",
  title: "Create Conversation Export",
  description:
    "Start an export of a conversation over a time range. Poll Get Conversation Export for the download link.",
  idempotent: false,
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
    { "key": "start", "label": "Start", "type": "datetime", "required": true, "hint": "ISO 8601." },
    { "key": "end", "label": "End", "type": "datetime", "required": true, "hint": "ISO 8601." },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Export ID" },
    { "key": "status", "type": "string", "label": "pending | done | failed" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/conversations/${seg(input.conversationId)}/export`, {
      method: "POST",
      body: { start: input.start, end: input.end },
    });
  },
};

export default conversationExportCreate;
