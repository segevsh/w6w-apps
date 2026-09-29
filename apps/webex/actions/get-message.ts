import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Get the details of a single message.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "personId", type: "string", label: "Author person ID" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/messages/${encodeURIComponent(input.messageId)}`);
  },
};

export default getMessage;
