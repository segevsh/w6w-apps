import type { ActionDefinition } from "@w6w/types";
import { SynthflowClient } from "../lib/client.ts";

interface Input {
  chat_id: string;
}

const chatGet: ActionDefinition<Input> = {
  key: "chat-get",
  type: "read",
  resource: "chat",
  title: "Get Chat",
  description: "Read a chat session with its conversation history and transcript.",
  params: [
    { key: "chat_id", label: "Chat ID", type: "string", required: true },
  ],
  output: [
    { key: "chat_id", type: "string", label: "Chat ID" },
    { key: "chat_status", type: "string", label: "Status" },
    { key: "conversation_history", type: "array", label: "Messages" },
    { key: "transcript", type: "string", label: "Transcript" },
  ],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/chat/${encodeURIComponent(input.chat_id)}`,
    );
  },
};

export default chatGet;
