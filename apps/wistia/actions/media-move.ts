import type { ActionDefinition } from "@w6w/types";
import { compact, toList, WistiaClient } from "../lib/client.ts";

interface Input {
  hashedIds: string[] | string;
  folderId: string;
  subfolderId?: string;
}

const mediaMove: ActionDefinition<Input> = {
  key: "media-move",
  type: "perform",
  resource: "media",
  title: "Move Media",
  description:
    "Move up to 100 media to a folder (and optional subfolder). Asynchronous: returns a " +
    "background job to poll with Get Background Job. Wistia allows 10 of these per 5 minutes.",
  idempotent: true,
  params: [
    {
      key: "hashedIds",
      label: "Media hashed IDs",
      type: "string",
      required: true,
      hint: "Comma-separated, at most 100.",
    },
    { key: "folderId", label: "Destination folder hashed ID", type: "string", required: true },
    {
      key: "subfolderId",
      label: "Destination subfolder hashed ID",
      type: "string",
      hint: "Must belong to the destination folder; omitted means the folder's default subfolder.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Message" },
    { key: "background_job_status", type: "object", label: "Background job" },
  ],

  execute(input, ctx) {
    const hashedIds = toList(input.hashedIds);
    if (!hashedIds) throw new Error("hashedIds is required");
    if (hashedIds.length > 100) throw new Error("Wistia moves at most 100 media per request");
    return new WistiaClient(ctx).json("/medias/move", {
      method: "PUT",
      body: compact({
        hashed_ids: hashedIds,
        folder_id: input.folderId,
        subfolder_id: input.subfolderId,
      }),
    });
  },
};

export default mediaMove;
