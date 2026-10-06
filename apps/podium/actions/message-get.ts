import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  conversation_uid: string;
  uid: string;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Get one message from a conversation. Requires scope `read_messages`.",
  params: [{
    key: "conversation_uid",
    label: "Conversation UID",
    type: "string",
    required: true,
  }, {
    key: "uid",
    label: "Message UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "attachmentUrl",
    type: "string",
    label: "URL of message attachment. This field is deprecated, please refer to t",
  }, {
    key: "body",
    type: "string",
    label: "Body of the message",
  }, {
    key: "contactName",
    type: "string",
    label: "Name of the contact",
  }, {
    key: "conversation",
    type: "object",
    label: "The conversation to which the message belongs",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the message was created",
  }, {
    key: "failureReason",
    type: "string",
    label: "If the message failed to send, this will be the reason",
  }, {
    key: "items",
    type: "array",
    label: "items",
  }, {
    key: "location",
    type: "object",
    label: "Location from which the message was sent or to where the message was s",
  }, {
    key: "senderUid",
    type: "string",
    label: "Podium unique identifier for user. If the message was sent from Podium",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for message",
  }, {
    key: "webchatUrl",
    type: "string",
    label: "The page URL where the webchat widget was submitted from. Only present",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(
      `/conversations/${encodeId(input.conversation_uid)}/messages/${encodeId(input.uid)}`,
    );
  },
};

export default messageGet;
