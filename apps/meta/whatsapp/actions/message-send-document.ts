import type { ActionDefinition } from "@w6w/types";
import { unset, WhatsAppClient } from "../lib/client.ts";
import { caption, messageOutput, to } from "../lib/params.ts";

interface Input {
  to: string;
  link: string;
  caption?: string;
  filename?: string;
}

/**
 * By link only — see `message-send-image` for why upload/media-id are out of
 * reach from inside the sandbox.
 */
const messageSendDocument: ActionDefinition<Input> = {
  key: "message-send-document",
  type: "perform",
  resource: "message",
  title: "Send Document",
  description: "Send a document (PDF, spreadsheet, any file type) by public URL.",
  idempotent: false,
  params: [
    to,
    {
      key: "link",
      label: "Document URL",
      type: "string",
      required: true,
      hint: "Public HTTP(S) URL. Meta fetches it — the number sending must be able to reach it.",
    },
    caption,
    {
      key: "filename",
      label: "File name",
      type: "string",
      hint: "Name shown to the recipient. Defaults to the URL's own file name if omitted.",
    },
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new WhatsAppClient(ctx).sendMessage({
      to: input.to,
      type: "document",
      document: {
        link: input.link,
        caption: unset(input.caption),
        filename: unset(input.filename),
      },
    });
  },
};

export default messageSendDocument;
