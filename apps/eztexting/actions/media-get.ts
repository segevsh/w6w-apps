import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";

/** `GET /v1/media-files/{id}`. */
interface Input {
  id: string;
}

const mediaGet: ActionDefinition<Input> = {
  key: "media-get",
  type: "read",
  resource: "media",
  title: "Get Media File",
  description: "Get one media file by ID.",
  params: [{ key: "id", label: "Media file ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Media file ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "url", type: "string", label: "URL" },
    { key: "uploadAt", type: "string", label: "Uploaded at" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json(`/media-files/${encodePathSegment(input.id)}`)) ??
      {};
  },
};

export default mediaGet;
