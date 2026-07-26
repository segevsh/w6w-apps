import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
  description?: string;
}

const chatSetDescription: ActionDefinition<Input, boolean> = {
  key: "chat-set-description",
  type: "perform",
  resource: "chat",
  title: "Set Chat Description",
  description:
    "Change a chat's description. Requires the `can_change_info` admin right. Send an empty value to clear it.",
  idempotent: true,
  params: [
    chatId,
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      validation: { maxLength: 255 },
      hint: "Leave empty to clear the description.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Updated" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("setChatDescription", {
      // Sent explicitly (not through `compact`) so an empty string can clear it.
      body: { chat_id: input.chatId, description: input.description ?? "" },
    });
  },
};

export default chatSetDescription;
