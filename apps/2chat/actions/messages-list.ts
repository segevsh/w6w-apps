import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  yourNumber: string;
  remoteNumber?: string;
  pageNumber?: number;
}

const messagesList: ActionDefinition<Input> = {
  key: "messages-list",
  type: "read",
  resource: "message",
  title: "List WhatsApp Messages",
  description: "List the messages on a connected number, newest first, 100 per page (GET " +
    "/whatsapp/messages/{your-number}[/{remote-number}]). Only messages after the number was " +
    "connected to 2Chat exist.",
  params: [
    {
      key: "yourNumber",
      label: "Your number",
      type: "string",
      required: true,
      hint: "The number connected to 2Chat.",
    },
    {
      key: "remoteNumber",
      label: "Remote number",
      type: "string",
      hint: "Optional. Only the conversation with this number.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Zero-based page index. 2Chat's first page is 0.",
    },
  ],
  output: [
    {
      key: "messages",
      type: "array",
      label: "Messages: uuid, timestamp, session_key, message{text,media}, sent_by …",
    },
    { key: "page_number", type: "number", label: "Page returned" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    const path = input.remoteNumber
      ? `/whatsapp/messages/${seg(input.yourNumber)}/${seg(input.remoteNumber)}`
      : `/whatsapp/messages/${seg(input.yourNumber)}`;
    return client.get(path, { page_number: input.pageNumber ?? 0 });
  },
};

export default messagesList;
