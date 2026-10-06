import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  exportId: string;
}

/** Check an export's status; when `done`, `link.url` is a time-limited download URL. */
const conversationExportGet: ActionDefinition<Input> = {
  key: "conversation-export-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation Export",
  description: "Check an export's status; when `done`, `link.url` is a time-limited download URL.",
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
    { "key": "exportId", "label": "Export ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Export ID" },
    { "key": "status", "type": "string", "label": "pending | done | failed" },
    { "key": "link", "type": "object", "label": "Download link and validity" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(
      `/conversations/${seg(input.conversationId)}/export/${seg(input.exportId)}`,
    );
  },
};

export default conversationExportGet;
