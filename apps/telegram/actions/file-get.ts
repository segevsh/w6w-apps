import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";

/**
 * Resolves a `file_id` (as found on any incoming photo/document/audio) into a
 * `file_path`. The downloadable URL is then
 * `https://api.telegram.org/file/bot<token>/<file_path>` — which this action
 * deliberately does not build, because it cannot see the token. Feed the
 * returned `file_path` to a step that downloads it.
 */
const fileGet: ActionDefinition<{ fileId: string }> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description:
    "Resolve a Telegram `file_id` into its size and `file_path`. Links stay valid for at least an hour.",
  params: [
    {
      key: "fileId",
      label: "File ID",
      type: "string",
      required: true,
      hint: "The `file_id` from an incoming photo, document, audio or video.",
    },
  ],
  output: [
    { key: "file_id", type: "string", label: "File ID" },
    { key: "file_unique_id", type: "string", label: "Unique file ID" },
    { key: "file_size", type: "number", label: "Size (bytes)" },
    { key: "file_path", type: "string", label: "Path on Telegram's file server" },
  ],

  execute(input, ctx) {
    return new TelegramClient(ctx).call("getFile", { query: { file_id: input.fileId } });
  },
};

export default fileGet;
