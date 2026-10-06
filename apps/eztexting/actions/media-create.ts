import type { ActionDefinition } from "@w6w/types";
import { EzTextingClient } from "../lib/client.ts";

/** `POST /v1/media-files` — upload a media file FROM A URL (the API has no binary upload). */
interface Input {
  mediaUrl: string;
}

const mediaCreate: ActionDefinition<Input> = {
  key: "media-create",
  type: "perform",
  resource: "media",
  title: "Create Media File",
  description: "Create a media file from a URL, to attach to MMS messages by ID.",
  idempotent: false,
  params: [{
    key: "mediaUrl",
    label: "Media URL",
    type: "string",
    required: true,
    hint: "Most standard image, video and audio files, up to 5MB.",
  }],
  output: [
    { key: "id", type: "string", label: "Media file ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "url", type: "string", label: "URL" },
    { key: "uploadAt", type: "string", label: "Uploaded at" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json("/media-files", {
      method: "POST",
      body: { mediaUrl: input.mediaUrl },
    })) ?? {};
  },
};

export default mediaCreate;
