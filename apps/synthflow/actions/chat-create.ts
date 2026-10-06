import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SynthflowClient } from "../lib/client.ts";

interface Input {
  chat_id?: string;
  model_id: string;
  metadata?: unknown;
}

const chatCreate: ActionDefinition<Input> = {
  key: "chat-create",
  type: "perform",
  resource: "chat",
  title: "Create Chat",
  description:
    "Open a text chat session with an agent. The chat id is a UUID: supply one, or leave it blank to have one generated.",
  idempotent: false,
  params: [
    { key: "chat_id", label: "Chat ID", type: "string", hint: "A UUID. Blank generates one." },
    {
      key: "model_id",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "The agent to chat with.",
    },
    { key: "metadata", label: "Metadata", type: "json" },
  ],
  output: [{ key: "chat_id", type: "string", label: "Chat ID" }, {
    key: "chat_status",
    type: "string",
    label: "Status",
  }, { key: "initial_message", type: "object", label: "Initial agent message" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/chat/${encodeURIComponent(input.chat_id || crypto.randomUUID())}`,
      {
        method: "POST",
        body: compact({
          model_id: input.model_id,
          metadata: asOptionalJson(input.metadata, "metadata"),
        }),
      },
    );
  },
};

export default chatCreate;
