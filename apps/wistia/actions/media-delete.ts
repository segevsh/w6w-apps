import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";
import { mediaIdParam } from "../lib/params.ts";

interface Input {
  mediaId: string;
}

const mediaDelete: ActionDefinition<Input> = {
  key: "media-delete",
  type: "perform",
  resource: "media",
  title: "Delete Media",
  description:
    "Delete a media. It moves to the account's Recently Deleted area and can be restored there " +
    "until the account's restore window ends, after which it is purged.",
  idempotent: true,
  params: [mediaIdParam],
  output: [
    { key: "hashed_id", type: "string", label: "Hashed ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new WistiaClient(ctx).json(`/medias/${encodeId(input.mediaId)}`, { method: "DELETE" });
  },
};

export default mediaDelete;
