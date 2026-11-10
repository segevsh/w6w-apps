import { snapshotTrigger } from "../lib/triggers.ts";
import type { ActionDefinition } from "@w6w/types";
import listAction from "../actions/message-list.ts";

const action = listAction as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-message",
  title: "New Message in Conversation",
  description:
    "The run gets each message newly added to the chosen conversation, polled from the existing `message-list` action (the whole thread, diffed by id).",
  action,
  input: (params) => ({ conversationId: params.conversationId }),
  params: [
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    {
      key: "attributes",
      type: "object",
      label: "Message attributes (channel, direction, preview)",
    },
  ],
  sample: {
    id: "5f0a1b2c3d4e5f6a7b8c9d0f",
    type: "message",
    attributes: { channel: "email", direction: "in", preview: "Where is my order?" },
  },
});
