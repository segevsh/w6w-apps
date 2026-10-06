import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  status?: string;
  inboxId?: string;
  snoozedUntil?: string;
  assignedUsers?: string[];
  labels?: string[];
}

/** Change a conversation's status, inbox, snooze time, assigned users or labels. Only the fields you set are sent. */
const conversationUpdate: ActionDefinition<Input> = {
  key: "conversation-update",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation",
  description:
    "Change a conversation's status, inbox, snooze time, assigned users or labels. Only the fields you set are sent.",
  idempotent: true,
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        { "value": "open", "label": "Open" },
        { "value": "done", "label": "Done" },
        { "value": "spam", "label": "Spam" },
        { "value": "archived", "label": "Archived" },
        { "value": "snoozed", "label": "Snoozed" },
      ],
    },
    {
      "key": "inboxId",
      "label": "Inbox ID",
      "type": "string",
      "hint": "Move the conversation to this inbox.",
    },
    {
      "key": "snoozedUntil",
      "label": "Snoozed until",
      "type": "datetime",
      "hint": "ISO 8601. Use with status `snoozed`.",
    },
    {
      "key": "assignedUsers",
      "label": "Assigned user IDs",
      "type": "json",
      "hint": 'Array of user ids, e.g. ["u_1"]. Replaces the current assignees.',
    },
    {
      "key": "labels",
      "label": "Label IDs",
      "type": "json",
      "hint": "Array of label ids. Replaces the current labels.",
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Conversation ID" },
    { "key": "status", "type": "string", "label": "Status" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.status) body.status = input.status;
    if (input.inboxId) body.inbox_id = input.inboxId;
    if (input.snoozedUntil) body.snoozed_until = input.snoozedUntil;
    if (input.assignedUsers) body.assigned_users = input.assignedUsers;
    if (input.labels) body.labels = input.labels;
    return new SuperchatClient(ctx).request(`/conversations/${seg(input.conversationId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default conversationUpdate;
