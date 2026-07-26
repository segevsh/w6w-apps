import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
  title: string;
}

const chatSetTitle: ActionDefinition<Input, boolean> = {
  key: "chat-set-title",
  type: "perform",
  resource: "chat",
  title: "Set Chat Title",
  description: "Rename a group, supergroup or channel. Requires the `can_change_info` admin right.",
  // Writes an absolute value, so re-running lands on the same state.
  idempotent: true,
  params: [
    chatId,
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 128 },
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Updated" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("setChatTitle", {
      body: { chat_id: input.chatId, title: input.title },
    });
  },
};

export default chatSetTitle;
