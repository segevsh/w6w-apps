import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
  body: string;
  senderName: string;
}

const conversationNoteCreate: ActionDefinition<Input> = {
  key: "conversation-note-create",
  type: "perform",
  resource: "conversation",
  title: "Add Conversation Note",
  description:
    "Add an internal note to a conversation. The note is not sent to the contact. Requires scope `write_messages`.",
  idempotent: false,
  params: [{
    key: "uid",
    label: "Conversation UID",
    type: "string",
    required: true,
  }, {
    key: "body",
    label: "Note",
    type: "text",
    required: true,
  }, {
    key: "senderName",
    label: "Sender name",
    type: "string",
    required: true,
    hint: "Name shown as the note author.",
  }],
  output: [{
    key: "body",
    type: "string",
    label: "Body of the note",
  }, {
    key: "conversation",
    type: "object",
    label: "Conversation that the conversation note belongs to",
  }, {
    key: "createdAt",
    type: "string",
    label: "Time at which the resource was created. Date time is in Coordinated Un",
  }, {
    key: "location",
    type: "object",
    label: "Location that the conversation note belongs to",
  }, {
    key: "organization",
    type: "object",
    label: "Organization that the conversation note belongs to",
  }, {
    key: "senderName",
    type: "string",
    label: "Name of the person who created the note",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for note",
  }, {
    key: "updatedAt",
    type: "string",
    label: "Time at which the resource was updated. Date time is in Coordinated Un",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/conversations/${encodeId(input.uid)}/notes`, {
      method: "POST",
      body: compact({
        body: input.body,
        senderName: input.senderName,
      }),
    });
  },
};

export default conversationNoteCreate;
