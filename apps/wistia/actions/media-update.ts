import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, toList, WistiaClient } from "../lib/client.ts";
import { mediaIdParam } from "../lib/params.ts";

interface Input {
  mediaId: string;
  name?: string;
  description?: string;
  tags?: string[] | string;
  newStillMediaId?: string;
}

const mediaUpdate: ActionDefinition<Input> = {
  key: "media-update",
  type: "perform",
  resource: "media",
  title: "Update Media",
  description: "Rename a media, change its description, replace its tags or swap its still image.",
  idempotent: true,
  params: [
    mediaIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text", hint: "Plain text or markdown." },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. REPLACES all existing tags on the media.",
    },
    {
      key: "newStillMediaId",
      label: "Still image hashed ID",
      type: "string",
      hint: "Hashed ID of an image that replaces the still shown before playback.",
    },
  ],
  output: [
    { key: "hashed_id", type: "string", label: "Hashed ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      description: input.description,
      tags: toList(input.tags),
      new_still_media_id: input.newStillMediaId,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("media-update needs at least one field to change");
    }
    return new WistiaClient(ctx).json(`/medias/${encodeId(input.mediaId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default mediaUpdate;
