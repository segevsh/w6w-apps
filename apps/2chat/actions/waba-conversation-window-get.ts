import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  toNumber: string;
}

const wabaConversationWindowGet: ActionDefinition<Input> = {
  key: "waba-conversation-window-get",
  type: "read",
  resource: "conversation",
  title: "Get WABA Conversation Window",
  description:
    "Check whether the 24-hour customer-service window is open between a WABA number and a contact " +
    "(GET /waba/conversation-window/{from}/{to}). Open: free-form text is allowed; closed: templates " +
    "only.",
  params: [
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
      hint: "Your WABA number. The leading + is optional.",
    },
    {
      key: "toNumber",
      label: "To number",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "window_open", type: "boolean", label: "True while free-form messages are allowed" },
    { key: "expires_at", type: "string", label: "When the window closes" },
    { key: "seconds_left", type: "number", label: "Seconds remaining" },
    { key: "allowed_message_types", type: "array", label: "free_form and/or template" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/waba/conversation-window/${seg(input.fromNumber)}/${seg(input.toNumber)}`);
  },
};

export default wabaConversationWindowGet;
