import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { statusOutput } from "../lib/params.ts";

/** `DELETE /v1/media-files/{id}`. */
interface Input {
  id: string;
}

const mediaDelete: ActionDefinition<Input> = {
  key: "media-delete",
  type: "perform",
  resource: "media",
  title: "Delete Media File",
  description: "Delete a media file by ID.",
  idempotent: true,
  params: [{ key: "id", label: "Media file ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Media file deleted" }, ...statusOutput],

  async execute(input, ctx) {
    const status = await new EzTextingClient(ctx).status(
      `/media-files/${encodePathSegment(input.id)}`,
      { method: "DELETE" },
    );
    return { id: input.id, status };
  },
};

export default mediaDelete;
