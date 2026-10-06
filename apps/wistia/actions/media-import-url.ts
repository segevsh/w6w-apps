import type { ActionDefinition } from "@w6w/types";
import { compact, WistiaClient } from "../lib/client.ts";

interface Input {
  url: string;
  folderId?: string;
}

const mediaImportUrl: ActionDefinition<Input> = {
  key: "media-import-url",
  type: "perform",
  resource: "media",
  title: "Import Media from URL",
  description:
    "Import a media file from a publicly accessible URL. Asynchronous: returns a background " +
    "job to poll with Get Background Job, not the media itself.",
  idempotent: false,
  params: [
    { key: "url", label: "Media URL", type: "string", required: true },
    {
      key: "folderId",
      label: "Folder hashed ID",
      type: "string",
      hint: 'Omit it and Wistia creates a new folder called "Untitled Folder".',
    },
  ],
  output: [
    { key: "message", type: "string", label: "Message" },
    {
      key: "background_job_status",
      type: "object",
      label: "Background job (id, hashed_id, status)",
    },
  ],

  execute(input, ctx) {
    if (!input.url?.trim()) throw new Error("url is required");
    return new WistiaClient(ctx).json("/medias/import_url", {
      method: "POST",
      body: compact({ url: input.url.trim(), folder_id: input.folderId }),
    });
  },
};

export default mediaImportUrl;
