import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { buildFileForm, type FileInput } from "../lib/files.ts";
import { chatId, fileParams } from "../lib/params.ts";

interface Input extends FileInput {
  chatId: string;
}

/**
 * `POST /api/v2/chats/{CHAT_ID}/files` — multipart upload, scope
 * `ZohoCliq.Webhooks.CREATE`, `204`. Up to 50 MB per file.
 */
const fileShareChat: ActionDefinition<Input, Success> = {
  key: "file-share-chat",
  type: "perform",
  resource: "file",
  title: "Share File in Chat",
  description: "Upload a file into a chat by chat id.",
  idempotent: false,
  params: [chatId, ...fileParams],
  output: [{ key: "success", type: "boolean", label: "Shared" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(`/chats/${seg(input.chatId)}/files`, {
      method: "POST",
      form: buildFileForm(input),
    });
    return SUCCESS;
  },
};

export default fileShareChat;
