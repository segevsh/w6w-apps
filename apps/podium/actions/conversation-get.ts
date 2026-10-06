import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Get one conversation by uid. Requires scope `read_messages`.",
  params: [{
    key: "uid",
    label: "Conversation UID",
    type: "string",
    required: true,
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
    return new PodiumClient(ctx).one(`/conversations/${encodeId(input.uid)}`);
  },
};

export default conversationGet;
