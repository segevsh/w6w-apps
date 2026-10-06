import type { ActionDefinition } from "@w6w/types";
import { compact, SynthflowClient } from "../lib/client.ts";

interface Input {
  chat_id: string;
  message: string;
}

const chatSendMessage: ActionDefinition<Input> = {
  key: "chat-send-message",
  type: "perform",
  resource: "chat",
  title: "Send Chat Message",
  description: "Send a message in a chat and receive the agent's reply.",
  idempotent: false,
  params: [
    { key: "chat_id", label: "Chat ID", type: "string", required: true },
    { key: "message", label: "Message", type: "text", required: true },
  ],
  output: [{ key: "agent_message", type: "string", label: "Agent reply" }, {
    key: "current_state",
    type: "string",
    label: "Agent state",
  }, { key: "turn_number", type: "number", label: "Turn number" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/chat/${encodeURIComponent(input.chat_id)}/messages`,
      {
        method: "POST",
        body: compact({
          message: input.message,
        }),
      },
    );
  },
};

export default chatSendMessage;
