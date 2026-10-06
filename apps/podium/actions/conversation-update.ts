import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, PodiumClient, toList } from "../lib/client.ts";

interface Input {
  uid: string;
  assignedUserUid?: string;
  assignedByName?: string;
  closed?: boolean;
  conversationAssigneeUids?: string[] | string;
}

const conversationUpdate: ActionDefinition<Input> = {
  key: "conversation-update",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation",
  description: "Assign, reassign or close a conversation. Requires scope `write_messages`.",
  idempotent: true,
  params: [{
    key: "uid",
    label: "Conversation UID",
    type: "string",
    required: true,
  }, {
    key: "assignedUserUid",
    label: "Assigned user UID",
    type: "string",
  }, {
    key: "assignedByName",
    label: "Assigned by (name)",
    type: "string",
  }, {
    key: "closed",
    label: "Closed",
    type: "boolean",
  }, {
    key: "conversationAssigneeUids",
    label: "Assignee UIDs",
    type: "string",
    hint: "Comma-separated user uids.",
  }],
  output: [{
    key: "assignedUserUid",
    type: "string",
    label: "Podium unique identifier for user",
  }, {
    key: "assigneeUids",
    type: "array",
    label: "List of assignee user UIDs",
  }, {
    key: "channel",
    type: "object",
    label: "Channel that the conversation is in",
  }, {
    key: "closed",
    type: "boolean",
    label: "Whether the conversation has been closed",
  }, {
    key: "contactName",
    type: "string",
    label: "Name of the contact",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the conversation was started",
  }, {
    key: "lastItemAt",
    type: "string",
    label: "When the last conversation item was added",
  }, {
    key: "locationUid",
    type: "string",
    label: "Podium unique identifier for location",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for conversation",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the conversation was last updated",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/conversations/${encodeId(input.uid)}`, {
      method: "PUT",
      body: compact({
        assignedUserUid: input.assignedUserUid,
        assignedByName: input.assignedByName,
        closed: input.closed,
        conversationAssigneeUids: toList(input.conversationAssigneeUids),
      }),
    });
  },
};

export default conversationUpdate;
