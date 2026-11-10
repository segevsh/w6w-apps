import type { ActionDefinition } from "@w6w/types";
import messageList from "../actions/message-list.ts";
import { idField, snapshotTrigger } from "../lib/snapshots.ts";

/**
 * `GET /issues/{id}/messages` is oldest first and, with no `limit` and no `cursor`, returns every
 * message of the issue, so each check diffs the message ids of the issue the user picked.
 */
export default snapshotTrigger({
  key: "new-issue-message",
  title: "New Issue Message",
  description: "The run gets each new reply or internal note on one issue.",
  action: messageList as unknown as ActionDefinition,
  paged: false,
  params: [{
    key: "id",
    label: "Issue ID or number",
    type: "string",
    required: true,
  }],
  input: (params) => ({ id: params.id }),
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "message_html", type: "string", label: "Message (HTML)" },
    { key: "is_private", type: "boolean", label: "Internal note" },
    { key: "timestamp", type: "string", label: "Sent at" },
  ],
  sample: {
    id: "msg_1",
    message_html: "<p>Thanks, looking into it.</p>",
    is_private: false,
    timestamp: "2026-11-10T09:30:00Z",
  },
});
