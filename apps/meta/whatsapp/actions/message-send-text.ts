import type { ActionDefinition } from "@w6w/types";
import { WhatsAppClient } from "../lib/client.ts";
import { messageOutput, to } from "../lib/params.ts";

interface Input {
  to: string;
  text: string;
  previewUrl?: boolean;
}

/**
 * Freeform text is only deliverable inside the 24-hour customer service
 * window (the 24h after the user last messaged this number) — outside it,
 * the Cloud API rejects the call and `message-send-template` is the only way
 * to reach the user. See the README's "24-hour messaging window" section.
 */
const messageSendText: ActionDefinition<Input> = {
  key: "message-send-text",
  type: "perform",
  resource: "message",
  title: "Send Text Message",
  description:
    "Send a freeform text message. Only deliverable within the 24-hour customer service window.",
  // Meta assigns a fresh message id per call and there is no request-scoped
  // dedupe key, so a retry sends a second message.
  idempotent: false,
  params: [
    to,
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Max 4096 characters.",
    },
    {
      key: "previewUrl",
      label: "Show link preview",
      type: "boolean",
      hint: "Render a preview card for the first URL in the text.",
    },
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new WhatsAppClient(ctx).sendMessage({
      to: input.to,
      type: "text",
      text: { body: input.text, preview_url: input.previewUrl },
    });
  },
};

export default messageSendText;
