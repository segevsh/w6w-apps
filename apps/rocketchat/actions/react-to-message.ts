import type { ActionDefinition } from "@w6w/types";
import { RocketChatClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  emoji: string;
  shouldReact?: boolean;
}

// Without `shouldReact` the endpoint TOGGLES the reaction, which would make a retry undo the
// first call. This always sends it explicitly (default true) so the action converges.
const reactToMessage: ActionDefinition<Input> = {
  key: "react-to-message",
  type: "perform",
  resource: "message",
  title: "React to Message",
  description: "Add or remove an emoji reaction on a message (`POST /chat.react`).",
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "emoji",
      label: "Emoji",
      type: "string",
      required: true,
      placeholder: ":thumbsup:",
      hint: "An emoji shortcode, with or without colons.",
    },
    {
      key: "shouldReact",
      label: "Add reaction",
      type: "boolean",
      default: true,
      hint: "True adds the reaction, false removes it.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Succeeded" }],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/chat.react", {
      method: "POST",
      body: {
        messageId: input.messageId,
        emoji: input.emoji,
        shouldReact: input.shouldReact ?? true,
      },
    });
  },
};

export default reactToMessage;
