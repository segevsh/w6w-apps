import type { ActionDefinition } from "@w6w/types";
import { call, requireStr } from "../lib/client.ts";
import { str, text } from "../lib/params.ts";

type Input = Record<string, unknown>;

const whatsappMessageSend: ActionDefinition<Input> = {
  key: "whatsapp-message-send",
  type: "perform",
  resource: "whatsapp",
  title: "Send WhatsApp Text (in session)",
  description:
    "Send a free-form text message to a user who has already messaged you (an open WhatsApp session). Use Send WhatsApp Template to start a conversation.",
  idempotent: false,
  params: [
    str("integratedNumber", "From (integrated number)", {
      required: true,
      hint: "Your integrated WhatsApp number, with country code.",
    }),
    str("recipientNumber", "To", { required: true, hint: "Recipient number with country code." }),
    text("text", "Message", { required: true }),
  ],
  output: [{ key: "response", type: "object", label: "MSG91's response" }],

  async execute(input, ctx) {
    const res = await call(ctx, "POST", "/whatsapp/whatsapp-outbound-message/", {
      query: {
        integrated_number: requireStr("integratedNumber", input.integratedNumber),
        recipient_number: requireStr("recipientNumber", input.recipientNumber),
        content_type: "text",
        text: requireStr("text", input.text),
      },
    });
    return { response: res };
  },
};

export default whatsappMessageSend;
